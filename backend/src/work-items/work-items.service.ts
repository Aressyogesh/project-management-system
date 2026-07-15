import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { AuditAction, AuditEntity, BillingStatus, BoardStatus, BugSeverity, ProjectRole, SystemRole, TaskPriority, WorkItemType } from '@prisma/client';
import * as XLSX from 'xlsx';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AutomationService } from '../automation-services/automation.service';
import { CreateWorkItemDto, MoveWorkItemDto, UpdateWorkItemDto } from './dto/work-item.dto';
import { generateWorkItemPrefix } from './work-items.utils';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'attachments');

const stripHtml = (val: string | null | undefined): string | null =>
  val ? val.replace(/<[^>]*>/g, '').trim() || null : null;

const STATUS_ORDER: BoardStatus[] = [
  BoardStatus.TODO,
  BoardStatus.IN_PROGRESS,
  BoardStatus.BLOCKED,
  BoardStatus.IN_REVIEW,
  BoardStatus.READY_FOR_QA,
  BoardStatus.IN_QA,
  BoardStatus.QA_DONE,
  BoardStatus.CLOSED,
];

const TERMINAL_STATUSES = new Set<BoardStatus>([BoardStatus.QA_DONE, BoardStatus.CLOSED]);

const VALID_PARENT_TYPES: Partial<Record<WorkItemType, WorkItemType[]>> = {
  [WorkItemType.USER_STORY]: [WorkItemType.EPIC],
  [WorkItemType.TASK]: [WorkItemType.EPIC, WorkItemType.USER_STORY],
  [WorkItemType.SUB_TASK]: [WorkItemType.TASK, WorkItemType.USER_STORY],
  [WorkItemType.BUG]: [WorkItemType.EPIC, WorkItemType.USER_STORY, WorkItemType.TASK],
};

const ITEM_INCLUDE = {
  assignee: { select: { id: true, fullName: true, profilePhoto: true } },
  reporter: { select: { id: true, fullName: true, profilePhoto: true } },
  responsibleUser: { select: { id: true, fullName: true, profilePhoto: true } },
  sprint: { select: { id: true, name: true } },
  parent: { select: { id: true, title: true, type: true, status: true } },
  releaseMilestone: { select: { id: true, description: true } },
  affectedMilestone: { select: { id: true, description: true } },
  children: {
    select: { id: true, title: true, type: true, status: true, priority: true, assigneeId: true },
    orderBy: { createdAt: 'asc' as const },
  },
  comments: {
    include: { author: { select: { id: true, fullName: true, profilePhoto: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  attachments: {
    include: { uploadedBy: { select: { id: true, fullName: true } } },
  },
  timesheetEntries: {
    include: { user: { select: { id: true, fullName: true } } },
    orderBy: { date: 'desc' as const },
  },
  activities: {
    include: { user: { select: { id: true, fullName: true, profilePhoto: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 100,
  },
};

@Injectable()
export class WorkItemsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly auditLogs: AuditLogsService,
    private readonly automation: AutomationService,
  ) {}

  async onModuleInit() {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  async findByProject(
    projectId: string,
    filters: {
      type?: WorkItemType;
      sprintId?: string;
      milestoneId?: string;
      assigneeId?: string;
      status?: BoardStatus;
      priority?: TaskPriority;
      search?: string;
    },
  ) {
    return this.prisma.workItem.findMany({
      where: {
        projectId,
        ...(filters.type && { type: filters.type }),
        ...(filters.sprintId !== undefined && {
          sprintId: filters.sprintId === 'backlog' ? null : filters.sprintId,
        }),
        ...(filters.milestoneId && {
          sprint: { milestoneId: filters.milestoneId },
        }),
        ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' as const } },
            { displayId: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }),
      },
      include: {
        assignee: { select: { id: true, fullName: true, profilePhoto: true } },
        reporter: { select: { id: true, fullName: true } },
        sprint: { select: { id: true, name: true } },
        parent: { select: { id: true, title: true, type: true } },
        _count: { select: { children: true, comments: true, timesheetEntries: true } },
        timesheetEntries: { select: { hours: true } },
      },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.workItem.findUnique({
      where: { id },
      include: ITEM_INCLUDE,
    });
    if (!item) throw new NotFoundException(`Work item ${id} not found`);
    return item;
  }

  async create(projectId: string, reporterId: string, dto: CreateWorkItemDto) {
    const requiresParent: WorkItemType[] = [WorkItemType.USER_STORY, WorkItemType.TASK, WorkItemType.SUB_TASK, WorkItemType.BUG];
    if (requiresParent.includes(dto.type) && !dto.parentId) {
      throw new BadRequestException(`A parent item is required when creating a ${dto.type.replace(/_/g, ' ').toLowerCase()}.`);
    }
    if (dto.parentId) await this.validateParentType(dto.type, dto.parentId);

    // BUG items are always Non-Billable
    if (dto.type === WorkItemType.BUG) dto.billingStatus = BillingStatus.NON_BILLABLE;

    const item = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id: projectId },
        data: { workItemCounter: { increment: 1 } },
        select: { name: true, workItemCounter: true },
      });

      const prefix = generateWorkItemPrefix(project.name);
      const displayId = `${prefix}${project.workItemCounter}`;

      return tx.workItem.create({
        data: {
          projectId, reporterId, displayId,
          type: dto.type, title: dto.title, description: dto.description,
          priority: dto.priority, parentId: dto.parentId, sprintId: dto.sprintId,
          assigneeId: dto.assigneeId, storyPoints: dto.storyPoints,
          estimatedHours: dto.estimatedHours, labels: dto.labels ?? [],
          components: dto.components ?? [], fixVersion: dto.fixVersion,
          severity: dto.severity, bugClassification: dto.bugClassification,
          environment: dto.environment, stepsToRepro: dto.stepsToRepro,
          definitionOfDone: dto.definitionOfDone,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          bugFlag: dto.bugFlag, bugReproducibility: dto.bugReproducibility,
          bugStatus: dto.bugStatus, module: dto.module,
          responsibleUserId: dto.responsibleUserId, billingStatus: dto.billingStatus,
          affectedBuildVersion: dto.affectedBuildVersion, fixedBuildVersion: dto.fixedBuildVersion,
          reminderType: dto.reminderType, releaseMilestoneId: dto.releaseMilestoneId,
          affectedMilestoneId: dto.affectedMilestoneId,
        },
        include: ITEM_INCLUDE,
      });
    });

    await this.logActivity(item.id, reporterId, 'created', undefined, undefined, item.title);

    this.auditLogs.log({
      userId: reporterId,
      action: AuditAction.WORK_ITEM_CREATED,
      entity: AuditEntity.WORK_ITEM,
      entityId: item.id,
      entityTitle: `${item.displayId} — ${item.title}`,
      projectId,
    });

    if (dto.parentId) {
      await this.logActivity(dto.parentId, reporterId, 'child_added', 'children', null, item.title);
    }

    // Notify assignee if set on creation
    if (dto.assigneeId && dto.assigneeId !== reporterId) {
      const reporter = await this.prisma.user.findUnique({ where: { id: reporterId }, select: { fullName: true } });
      await this.notifications.create({
        userId: dto.assigneeId, type: 'assigned',
        title: 'You were assigned a work item',
        body: `${reporter?.fullName ?? 'Someone'} assigned "${item.title}" to you`,
        workItemId: item.id,
      });
    }

    // Scenario 7: notify assignee on Slack when item is assigned on creation
    if (dto.assigneeId && dto.assigneeId !== reporterId && item.assignee) {
      const reporter = await this.prisma.user.findUnique({ where: { id: reporterId }, select: { fullName: true } });
      this.automation.notifyTaskAssigned(
        { id: item.id, displayId: item.displayId ?? '', title: item.title, type: item.type, priority: item.priority, dueDate: item.dueDate, estimatedHours: item.estimatedHours, projectId: item.projectId },
        item.assignee,
        { fullName: reporter?.fullName ?? 'Someone' },
      );
    }

    // Scenario 1: fire Teams card via Activepieces when a bug is created
    if (item.type === WorkItemType.BUG) {
      this.automation.notifyBugCreated({
        id: item.id,
        displayId: item.displayId ?? '',
        title: item.title,
        type: item.type,
        severity: item.severity,
        priority: item.priority,
        status: item.status,
        projectId: item.projectId,
        description: item.description,
        storyPoints: item.storyPoints,
        estimatedHours: item.estimatedHours,
        labels: item.labels as string[],
        components: item.components as string[],
        fixVersion: item.fixVersion,
        bugClassification: item.bugClassification,
        environment: item.environment,
        stepsToRepro: item.stepsToRepro,
        bugReproducibility: item.bugReproducibility,
        bugStatus: item.bugStatus,
        bugFlag: item.bugFlag,
        module: item.module,
        billingStatus: item.billingStatus,
        affectedBuildVersion: item.affectedBuildVersion,
        fixedBuildVersion: item.fixedBuildVersion,
        startDate: item.startDate,
        dueDate: item.dueDate,
        assignee: item.assignee,
        reporter: item.reporter,
        responsibleUser: item.responsibleUser,
        sprint: item.sprint,
        parent: item.parent,
        releaseMilestone: item.releaseMilestone,
        affectedMilestone: item.affectedMilestone,
        createdAt: item.createdAt,
      });
    }

    // Scenario 8: urgent alert when a CRITICAL severity bug is created
    if (item.type === WorkItemType.BUG && item.severity === BugSeverity.CRITICAL) {
      this.automation.notifyCriticalBug({
        id: item.id,
        displayId: item.displayId ?? '',
        title: item.title,
        severity: item.severity,
        priority: item.priority,
        projectId: item.projectId,
        description: item.description,
        environment: item.environment,
        stepsToRepro: item.stepsToRepro,
        assignee: item.assignee,
        reporter: item.reporter,
        createdAt: item.createdAt,
      });
    }

    return item;
  }

  async update(id: string, userId: string, userSystemRole: SystemRole, userProjectRole: ProjectRole | null, dto: UpdateWorkItemDto) {
    const item = await this.findOneOrFail(id);

    const isAdmin = userSystemRole === SystemRole.SUPER_USER || userSystemRole === SystemRole.ADMIN;
    const isPmOrTl = userProjectRole === ProjectRole.PROJECT_MANAGER || userProjectRole === ProjectRole.TEAM_LEAD;
    const isPm = userProjectRole === ProjectRole.PROJECT_MANAGER;
    const isOwner = item.assigneeId === userId || item.reporterId === userId;

    if (!isAdmin && !isPmOrTl && !isOwner) {
      throw new ForbiddenException('You can only edit items assigned to or reported by you');
    }

    // BUG items are always Non-Billable
    if (item.type === WorkItemType.BUG || dto.type === WorkItemType.BUG) {
      dto.billingStatus = BillingStatus.NON_BILLABLE;
    } else if (dto.billingStatus !== undefined && dto.billingStatus !== item.billingStatus) {
      if (!isAdmin && !isPm) {
        const membership = await this.prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: item.projectId, userId } },
          select: { projectRole: true },
        });
        if (membership?.projectRole !== ProjectRole.PROJECT_MANAGER) {
          throw new ForbiddenException('Only the Project Manager can change the billing status');
        }
      }
    }

    if (dto.parentId) await this.validateParentType(dto.type ?? item.type, dto.parentId);

    if (dto.status && dto.status !== item.status) {
      const toIdx = STATUS_ORDER.indexOf(dto.status);
      const inReviewIdx = STATUS_ORDER.indexOf(BoardStatus.IN_REVIEW);
      if (item.status === BoardStatus.IN_PROGRESS && toIdx >= inReviewIdx) {
        await this.requireTimeLogForForwardMove(id, item.type);
      }
    }

    const { startDate, dueDate, ...restDto } = dto;
    const isCompletingViaEdit = !!dto.status && TERMINAL_STATUSES.has(dto.status) && !TERMINAL_STATUSES.has(item.status);
    const isUncompletingViaEdit = TERMINAL_STATUSES.has(item.status) && !!dto.status && !TERMINAL_STATUSES.has(dto.status);
    const enteringReviewViaEdit = !!dto.status && dto.status === BoardStatus.IN_REVIEW && item.status !== BoardStatus.IN_REVIEW;
    const pulledBackFromReviewViaEdit = !!dto.status && item.status === BoardStatus.IN_REVIEW && dto.status === BoardStatus.IN_PROGRESS;
    const updated = await this.prisma.workItem.update({
      where: { id },
      data: {
        ...restDto,
        labels: dto.labels ?? undefined,
        components: dto.components ?? undefined,
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isCompletingViaEdit && { completedAt: new Date() }),
        ...(isUncompletingViaEdit && { completedAt: null }),
        ...(enteringReviewViaEdit && { inReviewAt: new Date() }),
        ...(pulledBackFromReviewViaEdit && { inReviewAt: null }),
      },
      include: {
        assignee: { select: { id: true, fullName: true, profilePhoto: true } },
        reporter: { select: { id: true, fullName: true } },
      },
    });

    // Log notable field changes — also mirrors each change on the parent item's activity log
    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    const actorName = actor?.fullName ?? 'Someone';

    const logWithParent = async (action: string, field?: string, oldValue?: string | null, newValue?: string | null) => {
      await this.logActivity(id, userId, action, field, oldValue, newValue);
      if (item.parentId) {
        const parentNewValue = oldValue != null && newValue != null
          ? `${oldValue} → ${newValue}`
          : (newValue ?? oldValue ?? null);
        await this.logActivity(item.parentId, userId, `child_${action}`, field,
          item.title, parentNewValue);
      }
    };

    if (dto.status && dto.status !== item.status) {
      await logWithParent('status_changed', 'status', item.status, dto.status);
      await this.checkAndPromoteParent(item.parentId, userId);

      // Scenario 10: alert when any item is blocked
      if (dto.status === BoardStatus.BLOCKED) {
        this.automation.notifyItemBlocked(
          { id: updated.id, displayId: updated.displayId ?? '', title: updated.title, type: updated.type, projectId: item.projectId, assignee: updated.assignee },
          { fullName: actorName },
        );
      }

      // Scenario 9: alert reporter when bug is moved back from a terminal status (reopened)
      if (item.type === WorkItemType.BUG && TERMINAL_STATUSES.has(item.status) && !!dto.status && !TERMINAL_STATUSES.has(dto.status)) {
        this.automation.notifyBugReopened(
          { id: updated.id, displayId: updated.displayId ?? '', title: updated.title, projectId: item.projectId, reopenCount: item.reopenCount + 1, assignee: updated.assignee, reporter: null },
          { fullName: actorName },
        );
      }

      // Scenario 6: route notification via Node-RED when status changes
      this.automation.notifyWorkItemStatusChanged(
        {
          id: updated.id,
          displayId: updated.displayId ?? '',
          title: updated.title,
          type: updated.type,
          status: updated.status,
          projectId: item.projectId,
          assignee: updated.assignee,
        },
        item.status,
        userId,
      );
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== item.assigneeId) {
      const [oldUser, newUser] = await Promise.all([
        item.assigneeId ? this.prisma.user.findUnique({ where: { id: item.assigneeId }, select: { fullName: true } }) : null,
        dto.assigneeId ? this.prisma.user.findUnique({ where: { id: dto.assigneeId }, select: { fullName: true } }) : null,
      ]);
      await logWithParent('assignee_changed', 'assignee',
        oldUser?.fullName ?? 'Unassigned', newUser?.fullName ?? 'Unassigned');
      if (dto.assigneeId && dto.assigneeId !== userId) {
        await this.notifications.create({
          userId: dto.assigneeId, type: 'assigned',
          title: 'You were assigned a work item',
          body: `${actorName} assigned "${item.title}" to you`,
          workItemId: id,
        });
        // Scenario 7: Slack alert to new assignee
        if (updated.assignee) {
          this.automation.notifyTaskAssigned(
            { id: updated.id, displayId: updated.displayId ?? '', title: updated.title, type: updated.type, priority: updated.priority, dueDate: item.dueDate, estimatedHours: updated.estimatedHours, projectId: item.projectId },
            updated.assignee,
            { fullName: actorName },
          );
        }
      }
    }
    if (dto.priority && dto.priority !== item.priority) {
      await logWithParent('priority_changed', 'priority', item.priority, dto.priority);
    }
    if (dto.title && dto.title !== item.title) {
      await logWithParent('title_changed', 'title', item.title, dto.title);
    }
    if (dto.sprintId !== undefined && dto.sprintId !== item.sprintId) {
      const [oldSprint, newSprint] = await Promise.all([
        item.sprintId ? this.prisma.sprint.findUnique({ where: { id: item.sprintId }, select: { name: true } }) : null,
        dto.sprintId ? this.prisma.sprint.findUnique({ where: { id: dto.sprintId }, select: { name: true } }) : null,
      ]);
      await logWithParent('sprint_changed', 'sprint',
        oldSprint?.name ?? 'Backlog', newSprint?.name ?? 'Backlog');
    }
    if (dueDate !== undefined && dueDate !== (item.dueDate?.toISOString().split('T')[0] ?? null)) {
      await logWithParent('due_date_changed', 'due date',
        item.dueDate?.toISOString().split('T')[0] ?? null, dueDate ?? null);
    }
    if (dto.storyPoints !== undefined && dto.storyPoints !== item.storyPoints) {
      await logWithParent('story_points_changed', 'story points',
        String(item.storyPoints ?? '—'), String(dto.storyPoints ?? '—'));
    }
    if (dto.description !== undefined && dto.description !== item.description) {
      await logWithParent('description_updated', 'description', null, null);
    }
    if (dto.labels !== undefined) {
      const oldLabels = (item.labels ?? []) as string[];
      const newLabels = dto.labels as string[];
      for (const label of newLabels.filter((l) => !oldLabels.includes(l))) {
        await logWithParent('label_added', 'labels', null, label);
      }
      for (const label of oldLabels.filter((l) => !newLabels.includes(l))) {
        await logWithParent('label_removed', 'labels', label, null);
      }
    }
    if (dto.estimatedHours !== undefined && dto.estimatedHours !== (item.estimatedHours != null ? Number(item.estimatedHours) : null)) {
      await logWithParent('estimated_hours_changed', 'estimated hours',
        item.estimatedHours != null ? String(item.estimatedHours) : null,
        dto.estimatedHours != null ? String(dto.estimatedHours) : null);
    }
    if (startDate !== undefined) {
      const oldStart = item.startDate?.toISOString().split('T')[0] ?? null;
      if (startDate !== oldStart) {
        await logWithParent('start_date_changed', 'start date', oldStart, startDate ?? null);
      }
    }
    if (dto.severity !== undefined && dto.severity !== item.severity) {
      await logWithParent('severity_changed', 'severity', item.severity ?? null, dto.severity ?? null);
    }
    if (dto.bugStatus !== undefined && dto.bugStatus !== item.bugStatus) {
      await logWithParent('bug_status_changed', 'bug status', item.bugStatus ?? null, dto.bugStatus ?? null);
    }
    if (dto.module !== undefined && dto.module !== item.module) {
      await logWithParent('module_changed', 'module', item.module ?? null, dto.module ?? null);
    }
    if (dto.fixVersion !== undefined && dto.fixVersion !== item.fixVersion) {
      await logWithParent('fix_version_changed', 'fix version', item.fixVersion ?? null, dto.fixVersion ?? null);
    }
    if (dto.bugClassification !== undefined && dto.bugClassification !== item.bugClassification) {
      await logWithParent('classification_changed', 'classification', item.bugClassification ?? null, dto.bugClassification ?? null);
    }
    if (dto.bugFlag !== undefined && dto.bugFlag !== item.bugFlag) {
      await logWithParent('flag_changed', 'flag', item.bugFlag ?? null, dto.bugFlag ?? null);
    }
    if (dto.bugReproducibility !== undefined && dto.bugReproducibility !== item.bugReproducibility) {
      await logWithParent('reproducibility_changed', 'reproducibility', item.bugReproducibility ?? null, dto.bugReproducibility ?? null);
    }
    if (dto.billingStatus !== undefined && dto.billingStatus !== item.billingStatus) {
      await logWithParent('billing_changed', 'billing', item.billingStatus ?? null, dto.billingStatus ?? null);
    }
    if (dto.environment !== undefined && dto.environment !== item.environment) {
      await logWithParent('environment_changed', 'environment', item.environment ?? null, dto.environment ?? null);
    }
    if (dto.affectedBuildVersion !== undefined && dto.affectedBuildVersion !== item.affectedBuildVersion) {
      await logWithParent('affected_build_changed', 'affected build', item.affectedBuildVersion ?? null, dto.affectedBuildVersion ?? null);
    }
    if (dto.fixedBuildVersion !== undefined && dto.fixedBuildVersion !== item.fixedBuildVersion) {
      await logWithParent('fixed_build_changed', 'fixed build', item.fixedBuildVersion ?? null, dto.fixedBuildVersion ?? null);
    }
    if (dto.reminderType !== undefined && dto.reminderType !== item.reminderType) {
      await logWithParent('reminder_changed', 'reminder', item.reminderType ?? null, dto.reminderType ?? null);
    }
    if (dto.stepsToRepro !== undefined && dto.stepsToRepro !== item.stepsToRepro) {
      await logWithParent('steps_updated', 'steps to reproduce', null, null);
    }
    if (dto.responsibleUserId !== undefined && dto.responsibleUserId !== item.responsibleUserId) {
      const [oldResp, newResp] = await Promise.all([
        item.responsibleUserId ? this.prisma.user.findUnique({ where: { id: item.responsibleUserId }, select: { fullName: true } }) : null,
        dto.responsibleUserId ? this.prisma.user.findUnique({ where: { id: dto.responsibleUserId }, select: { fullName: true } }) : null,
      ]);
      await logWithParent('responsible_changed', 'responsible dev',
        oldResp?.fullName ?? 'None', newResp?.fullName ?? 'None');
    }
    if (dto.releaseMilestoneId !== undefined && dto.releaseMilestoneId !== item.releaseMilestoneId) {
      const [oldM, newM] = await Promise.all([
        item.releaseMilestoneId ? this.prisma.milestone.findUnique({ where: { id: item.releaseMilestoneId }, select: { description: true } }) : null,
        dto.releaseMilestoneId ? this.prisma.milestone.findUnique({ where: { id: dto.releaseMilestoneId }, select: { description: true } }) : null,
      ]);
      await logWithParent('release_milestone_changed', 'release milestone',
        stripHtml(oldM?.description) ?? 'None', stripHtml(newM?.description) ?? 'None');
    }
    if (dto.affectedMilestoneId !== undefined && dto.affectedMilestoneId !== item.affectedMilestoneId) {
      const [oldM, newM] = await Promise.all([
        item.affectedMilestoneId ? this.prisma.milestone.findUnique({ where: { id: item.affectedMilestoneId }, select: { description: true } }) : null,
        dto.affectedMilestoneId ? this.prisma.milestone.findUnique({ where: { id: dto.affectedMilestoneId }, select: { description: true } }) : null,
      ]);
      await logWithParent('affected_milestone_changed', 'affected milestone',
        stripHtml(oldM?.description) ?? 'None', stripHtml(newM?.description) ?? 'None');
    }
    if (dto.components !== undefined) {
      const oldComps = (item.components ?? []) as string[];
      const newComps = dto.components as string[];
      for (const c of newComps.filter((x) => !oldComps.includes(x))) {
        await logWithParent('component_added', 'components', null, c);
      }
      for (const c of oldComps.filter((x) => !newComps.includes(x))) {
        await logWithParent('component_removed', 'components', c, null);
      }
    }
    if (dto.parentId !== undefined && dto.parentId !== item.parentId) {
      const [oldParent, newParent] = await Promise.all([
        item.parentId ? this.prisma.workItem.findUnique({ where: { id: item.parentId }, select: { title: true } }) : null,
        dto.parentId ? this.prisma.workItem.findUnique({ where: { id: dto.parentId }, select: { title: true } }) : null,
      ]);
      await this.logActivity(id, userId, 'parent_changed', 'parent',
        oldParent?.title ?? 'None', newParent?.title ?? 'None');
    }

    this.auditLogs.log({
      userId,
      action: AuditAction.WORK_ITEM_UPDATED,
      entity: AuditEntity.WORK_ITEM,
      entityId: id,
      entityTitle: `${item.displayId ?? ''} — ${item.title}`.trim().replace(/^—\s*/, ''),
      projectId: item.projectId,
    });

    return updated;
  }

  async move(id: string, userId: string, dto: MoveWorkItemDto) {
    const item = await this.findOneOrFail(id);
    const fromIdx = STATUS_ORDER.indexOf(item.status);
    const toIdx = STATUS_ORDER.indexOf(dto.status);
    const isBackward = toIdx < fromIdx;
    const isCompletingNow = TERMINAL_STATUSES.has(dto.status) && !TERMINAL_STATUSES.has(item.status);
    const isUncompletingNow = TERMINAL_STATUSES.has(item.status) && !TERMINAL_STATUSES.has(dto.status);

    const inReviewIdx = STATUS_ORDER.indexOf(BoardStatus.IN_REVIEW);
    if (item.status === BoardStatus.IN_PROGRESS && toIdx >= inReviewIdx) {
      await this.requireTimeLogForForwardMove(id, item.type);
    }

    // inReviewAt: set when card enters IN_REVIEW; cleared when pulled back to IN_PROGRESS.
    const enteringReview = dto.status === BoardStatus.IN_REVIEW && item.status !== BoardStatus.IN_REVIEW;
    const pulledBackFromReview = item.status === BoardStatus.IN_REVIEW && dto.status === BoardStatus.IN_PROGRESS;
    // qaReopenCount: incremented only for IN_QA → IN_PROGRESS (rework per KPI spec).
    const isQaReopen = item.status === BoardStatus.IN_QA && dto.status === BoardStatus.IN_PROGRESS;

    const result = await this.prisma.workItem.update({
      where: { id },
      data: {
        status: dto.status,
        position: dto.position ?? 0,
        ...(isCompletingNow && { completedAt: new Date() }),
        ...(isUncompletingNow && { completedAt: null }),
        ...(isBackward && { reopenCount: { increment: 1 } }),
        ...(enteringReview && { inReviewAt: new Date() }),
        ...(pulledBackFromReview && { inReviewAt: null }),
        ...(isQaReopen && { qaReopenCount: { increment: 1 } }),
      },
    });

    if (dto.status !== item.status) {
      await this.logActivity(id, userId, 'status_changed', 'status', item.status, dto.status);
      await this.checkAndPromoteParent(item.parentId, userId);

      this.auditLogs.log({
        userId,
        action: AuditAction.WORK_ITEM_STATUS_CHANGED,
        entity: AuditEntity.WORK_ITEM,
        entityId: item.id,
        entityTitle: `${item.displayId} — ${item.title}`,
        projectId: item.projectId,
        metadata: { from: item.status, to: dto.status },
      });

      const [actor, assignee] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
        item.assigneeId ? this.prisma.user.findUnique({ where: { id: item.assigneeId }, select: { id: true, fullName: true, profilePhoto: true } }) : null,
      ]);
      const actorName = actor?.fullName ?? 'Someone';

      if (dto.status === BoardStatus.BLOCKED) {
        this.automation.notifyItemBlocked(
          { id: item.id, displayId: item.displayId ?? '', title: item.title, type: item.type, projectId: item.projectId, assignee },
          { fullName: actorName },
        );
      }

      if (item.type === WorkItemType.BUG && TERMINAL_STATUSES.has(item.status) && !TERMINAL_STATUSES.has(dto.status)) {
        this.automation.notifyBugReopened(
          { id: item.id, displayId: item.displayId ?? '', title: item.title, projectId: item.projectId, reopenCount: item.reopenCount + 1, assignee, reporter: null },
          { fullName: actorName },
        );
      }

      this.automation.notifyWorkItemStatusChanged(
        { id: item.id, displayId: item.displayId ?? '', title: item.title, type: item.type, status: dto.status, projectId: item.projectId, assignee },
        item.status,
        userId,
      );
    }

    return result;
  }

  async remove(id: string, userId?: string) {
    const item = await this.findOneOrFail(id);
    const result = await this.prisma.workItem.delete({ where: { id } });

    if (userId) {
      this.auditLogs.log({
        userId,
        action: AuditAction.WORK_ITEM_DELETED,
        entity: AuditEntity.WORK_ITEM,
        entityId: id,
        entityTitle: `${item.displayId} — ${item.title}`,
        projectId: item.projectId,
      });
    }

    return result;
  }

  async addComment(workItemId: string, authorId: string, content: string, mentions: string[] = []) {
    const workItem = await this.findOneOrFail(workItemId);

    const comment = await this.prisma.workItemComment.create({
      data: { workItemId, authorId, content, mentions },
      include: { author: { select: { id: true, fullName: true, profilePhoto: true } } },
    });

    await this.logActivity(workItemId, authorId, 'commented', undefined, undefined, content.slice(0, 100));

    this.auditLogs.log({
      userId: authorId,
      action: AuditAction.COMMENT_ADDED,
      entity: AuditEntity.COMMENT,
      entityId: comment.id,
      entityTitle: workItem.title,
      projectId: workItem.projectId,
    });

    // Notify mentioned users
    if (mentions.length > 0) {
      const author = await this.prisma.user.findUnique({ where: { id: authorId }, select: { fullName: true } });
      const item = await this.prisma.workItem.findUnique({ where: { id: workItemId }, select: { title: true } });
      const notifs = mentions
        .filter((uid) => uid !== authorId)
        .map((uid) => ({
          userId: uid, type: 'mention',
          title: 'You were mentioned in a comment',
          body: `${author?.fullName ?? 'Someone'} mentioned you on "${item?.title ?? 'a work item'}"`,
          workItemId,
        }));
      await this.notifications.createMany(notifs);
    }

    return comment;
  }

  async removeComment(commentId: string, userId: string, systemRole: SystemRole) {
    const comment = await this.prisma.workItemComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    if (comment.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const workItem = await this.prisma.workItem.findUnique({
      where: { id: comment.workItemId },
      select: { id: true, title: true, projectId: true },
    });

    const result = await this.prisma.workItemComment.delete({ where: { id: commentId } });

    if (workItem) {
      await this.logActivity(workItem.id, userId, 'comment_deleted', undefined, comment.content.slice(0, 100), null);
      this.auditLogs.log({
        userId,
        action: AuditAction.COMMENT_DELETED,
        entity: AuditEntity.COMMENT,
        entityId: commentId,
        entityTitle: workItem.title,
        projectId: workItem.projectId,
      });
    }

    return result;
  }

  async addAttachment(workItemId: string, file: Express.Multer.File, uploadedById: string) {
    const workItem = await this.findOneOrFail(workItemId);
    const attachment = await this.prisma.workItemAttachment.create({
      data: { workItemId, filename: file.filename, originalName: file.originalname, mimeType: file.mimetype, size: file.size, uploadedById },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
    });
    await this.logActivity(workItemId, uploadedById, 'attachment_added', undefined, undefined, file.originalname);
    this.auditLogs.log({
      userId: uploadedById,
      action: AuditAction.ATTACHMENT_ADDED,
      entity: AuditEntity.ATTACHMENT,
      entityId: attachment.id,
      entityTitle: `${file.originalname} on "${workItem.title}"`,
      projectId: workItem.projectId,
    });
    return attachment;
  }

  async getAttachment(id: string) {
    const a = await this.prisma.workItemAttachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Attachment not found');
    return a;
  }

  async removeAttachment(id: string, userId?: string) {
    const a = await this.getAttachment(id);
    try { await unlink(join(UPLOAD_DIR, a.filename)); } catch (e: any) { if (e.code !== 'ENOENT') throw e; }
    await this.prisma.workItemAttachment.delete({ where: { id } });

    if (userId) {
      const workItem = await this.prisma.workItem.findUnique({
        where: { id: a.workItemId },
        select: { title: true, projectId: true },
      });
      await this.logActivity(a.workItemId, userId, 'attachment_deleted', undefined, a.originalName, null);
      this.auditLogs.log({
        userId,
        action: AuditAction.ATTACHMENT_DELETED,
        entity: AuditEntity.ATTACHMENT,
        entityId: id,
        entityTitle: `${a.originalName} on "${workItem?.title ?? a.workItemId}"`,
        projectId: workItem?.projectId,
      });
    }
  }

  getActivities(workItemId: string) {
    return this.prisma.workItemActivity.findMany({
      where: { workItemId },
      include: { user: { select: { id: true, fullName: true, profilePhoto: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async checkAndPromoteParent(parentId: string | null, userId: string) {
    if (!parentId) return;
    const siblings = await this.prisma.workItem.findMany({
      where: { parentId },
      select: { status: true },
    });
    if (siblings.length === 0) return;
    const allDone = siblings.every((s) => TERMINAL_STATUSES.has(s.status));
    if (!allDone) return;
    const parent = await this.prisma.workItem.findUnique({
      where: { id: parentId },
      select: { status: true },
    });
    if (!parent || TERMINAL_STATUSES.has(parent.status)) return;
    await this.prisma.workItem.update({
      where: { id: parentId },
      data: { status: BoardStatus.QA_DONE, completedAt: new Date() },
    });
    await this.logActivity(parentId, userId, 'status_changed', 'status',
      parent.status, BoardStatus.QA_DONE);
  }

  private async requireTimeLogForForwardMove(id: string, type: WorkItemType): Promise<void> {
    let count: number;

    if (type === WorkItemType.USER_STORY || type === WorkItemType.EPIC) {
      const children = await this.prisma.workItem.findMany({
        where: { parentId: id },
        select: { id: true },
      });
      const childIds = children.map(c => c.id);
      count = await this.prisma.timesheetEntry.count({
        where: { workItemId: { in: [id, ...childIds] } },
      });
    } else {
      count = await this.prisma.timesheetEntry.count({
        where: { workItemId: id },
      });
    }

    if (count === 0) {
      throw new BadRequestException(
        'Log time against this item before moving it forward',
      );
    }
  }

  private async logActivity(
    workItemId: string, userId: string, action: string,
    field?: string, oldValue?: string | null, newValue?: string | null,
  ) {
    const trunc = (v: string | null | undefined) =>
      v ? String(v).slice(0, 490) : null;
    return this.prisma.workItemActivity.create({
      data: {
        workItemId, userId, action: action.slice(0, 100),
        field: field ? field.slice(0, 100) : null,
        oldValue: trunc(oldValue),
        newValue: trunc(newValue),
      },
    });
  }

  private async validateParentType(childType: WorkItemType, parentId: string) {
    const validParents = VALID_PARENT_TYPES[childType];
    if (!validParents) return;
    const parent = await this.prisma.workItem.findUnique({ where: { id: parentId }, select: { type: true } });
    if (!parent) throw new NotFoundException(`Parent work item ${parentId} not found`);
    if (!validParents.includes(parent.type)) {
      throw new BadRequestException(
        `${childType} cannot have a ${parent.type} as parent. Valid parents: ${validParents.join(', ')}`,
      );
    }
  }

  private async findOneOrFail(id: string) {
    const item = await this.prisma.workItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Work item ${id} not found`);
    return item;
  }

  async getImportTemplate(): Promise<Buffer> {
    const headers = [
      'Title', 'Work Item Type', 'Assignee Email', 'Sprint Name', 'Priority',
      'Story Points', 'Est. Hours', 'Billing Status', 'Start Date', 'Due Date',
      'Parent ID', 'Labels', 'Release Milestone', 'Description',
    ];
    const sampleRows = [
      [
        'User Authentication Module', 'USER_STORY', 'john.doe@company.com', 'Sprint 1',
        'HIGH', '8', '16', 'BILLABLE', '07-01-2026', '07-15-2026', '', 'auth,security', '',
        'As a user, I want to log in securely using email and password',
      ],
      [
        'Create Login API', 'TASK', 'jane.smith@company.com', 'Sprint 1', 'HIGH', '3', '8',
        'BILLABLE', '07-01-2026', '07-08-2026', 'MEP10001', 'api,backend', '',
        'Implement POST /auth/login endpoint with JWT token generation',
      ],
      [
        'Write Login Unit Tests', 'SUB_TASK', '', 'Sprint 1', 'MEDIUM', '1', '4',
        'NON_BILLABLE', '07-05-2026', '07-08-2026', 'MEP10002', 'testing', '',
        'Unit tests for login service and controller',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 35 }, { wch: 18 }, { wch: 28 }, { wch: 15 }, { wch: 12 },
      { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 20 }, { wch: 22 }, { wch: 50 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Items');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async importWorkItems(
    projectId: string,
    reporterId: string,
    fileBuffer: Buffer,
    dryRun: boolean,
  ): Promise<{ results: ImportRowResult[]; success: boolean }> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false, defval: '' });

    if (rows.length === 0) throw new BadRequestException('The uploaded file has no data rows.');

    const [projectMembers, sprints, milestones] = await Promise.all([
      this.prisma.projectMember.findMany({
        where: { projectId },
        include: { user: { select: { id: true, email: true } } },
      }),
      this.prisma.sprint.findMany({ where: { projectId }, select: { id: true, name: true } }),
      this.prisma.milestone.findMany({ where: { projectId }, select: { id: true, description: true } }),
    ]);

    const memberByEmail = new Map(projectMembers.map((m) => [m.user.email.toLowerCase(), m.user.id]));
    const sprintByName = new Map(sprints.map((s) => [s.name.toLowerCase(), s.id]));
    const milestoneByDesc = new Map(milestones.filter((m) => m.description).map((m) => [(m.description as string).toLowerCase(), m.id]));

    const VALID_TYPES = new Set(['USER_STORY', 'TASK', 'SUB_TASK']);
    const VALID_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', '']);
    const VALID_BILLING = new Set(['BILLABLE', 'NON_BILLABLE', '']);

    const parsedItems: (Record<string, any> | null)[] = [];
    const results: ImportRowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const errors: string[] = [];

      const title = String(row['Title'] ?? '').trim();
      const typeRaw = String(row['Work Item Type'] ?? '').trim().toUpperCase().replace(/\s+/g, '_');
      const assigneeEmail = String(row['Assignee Email'] ?? '').trim().toLowerCase();
      const sprintName = String(row['Sprint Name'] ?? '').trim();
      const priorityRaw = String(row['Priority'] ?? '').trim().toUpperCase();
      const storyPointsRaw = String(row['Story Points'] ?? '').trim();
      const estHoursRaw = String(row['Est. Hours'] ?? '').trim();
      const billingRaw = String(row['Billing Status'] ?? '').trim().toUpperCase().replace(/\s+/g, '_');
      const startDateRaw = String(row['Start Date'] ?? '').trim();
      const dueDateRaw = String(row['Due Date'] ?? '').trim();
      const parentIdRaw = String(row['Parent ID'] ?? '').trim().toUpperCase();
      const labelsRaw = String(row['Labels'] ?? '').trim();
      const milestoneRaw = String(row['Release Milestone'] ?? '').trim().toLowerCase();
      const description = String(row['Description'] ?? '').trim();

      // Required fields
      if (!title) errors.push('Title is required');

      if (!typeRaw) {
        errors.push('Work Item Type is required');
      } else if (!VALID_TYPES.has(typeRaw)) {
        errors.push(`Work Item Type must be USER_STORY, TASK, or SUB_TASK (got: "${row['Work Item Type']}")`);
      }

      if (!assigneeEmail) errors.push('Assignee Email is required');

      if (!priorityRaw) {
        errors.push('Priority is required (LOW, MEDIUM, HIGH, CRITICAL)');
      } else if (!VALID_PRIORITIES.has(priorityRaw)) {
        errors.push('Priority must be LOW, MEDIUM, HIGH, or CRITICAL');
      }

      if (!estHoursRaw) errors.push('Est. Hours is required');

      if (!billingRaw) {
        errors.push('Billing Status is required (BILLABLE or NON_BILLABLE)');
      }

      if (!startDateRaw) errors.push('Start Date is required (MM-DD-YYYY)');
      if (!dueDateRaw) errors.push('Due Date is required (MM-DD-YYYY)');
      if (!parentIdRaw) errors.push('Parent ID is required');
      if (!description) errors.push('Description is required');

      // Sprint Name, Story Points, Labels, Release Milestone are optional

      let assigneeId: string | undefined;
      if (assigneeEmail) {
        const uid = memberByEmail.get(assigneeEmail);
        if (!uid) errors.push(`Assignee "${row['Assignee Email']}" is not a member of this project`);
        else assigneeId = uid;
      }

      let sprintId: string | undefined;
      if (sprintName) {
        const sid = sprintByName.get(sprintName.toLowerCase());
        if (!sid) errors.push(`Sprint "${sprintName}" not found in this project`);
        else sprintId = sid;
      }

      let parentId: string | undefined;
      if (parentIdRaw) {
        const parent = await this.prisma.workItem.findFirst({
          where: { projectId, displayId: parentIdRaw },
          select: { id: true, type: true },
        });
        if (!parent) {
          errors.push(`Parent ID "${parentIdRaw}" not found in this project`);
        } else {
          const validParents = VALID_PARENT_TYPES[typeRaw as WorkItemType];
          if (validParents && !validParents.includes(parent.type)) {
            errors.push(`${typeRaw} cannot have a ${parent.type} as parent. Valid: ${validParents.join(', ')}`);
          } else {
            parentId = parent.id;
          }
        }
      }

      let storyPoints: number | undefined;
      if (storyPointsRaw) {
        const n = Number(storyPointsRaw);
        if (isNaN(n) || n < 0) errors.push('Story Points must be a non-negative number');
        else storyPoints = Math.round(n);
      }

      let estimatedHours: number | undefined;
      if (estHoursRaw) {
        const n = Number(estHoursRaw);
        if (isNaN(n) || n < 0) errors.push('Est. Hours must be a non-negative number');
        else estimatedHours = n;
      }

      let billingStatus: BillingStatus | undefined;
      if (billingRaw) {
        if (!VALID_BILLING.has(billingRaw)) {
          errors.push('Billing Status must be BILLABLE or NON_BILLABLE');
        } else {
          billingStatus = billingRaw as BillingStatus;
        }
      }

      // Parse dates as MM-DD-YYYY
      let startDate: Date | undefined;
      if (startDateRaw) {
        const [mm, dd, yyyy] = startDateRaw.split('-').map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        if (!mm || !dd || !yyyy || isNaN(d.getTime())) errors.push(`Start Date "${startDateRaw}" is not a valid date (use MM-DD-YYYY)`);
        else startDate = d;
      }

      let dueDate: Date | undefined;
      if (dueDateRaw) {
        const [mm, dd, yyyy] = dueDateRaw.split('-').map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        if (!mm || !dd || !yyyy || isNaN(d.getTime())) errors.push(`Due Date "${dueDateRaw}" is not a valid date (use MM-DD-YYYY)`);
        else dueDate = d;
      }

      const labels = labelsRaw ? labelsRaw.split(',').map((l) => l.trim()).filter(Boolean) : [];

      let releaseMilestoneId: string | undefined;
      if (milestoneRaw) {
        const mid = milestoneByDesc.get(milestoneRaw);
        if (!mid) errors.push(`Release Milestone "${row['Release Milestone']}" not found in this project`);
        else releaseMilestoneId = mid;
      }

      results.push({ row: rowNum, title: title || `(Row ${rowNum})`, type: typeRaw, status: errors.length === 0 ? 'valid' : 'error', errors });

      parsedItems.push(
        errors.length === 0
          ? {
              type: typeRaw as WorkItemType,
              title, description,
              priority: (priorityRaw || 'MEDIUM') as TaskPriority,
              assigneeId, sprintId, parentId, storyPoints, estimatedHours,
              billingStatus, startDate, dueDate, labels, releaseMilestoneId,
            }
          : null,
      );
    }

    if (dryRun) return { results, success: results.every((r) => r.status === 'valid') };

    if (!results.every((r) => r.status === 'valid')) {
      throw new BadRequestException('Import has validation errors. Run with dryRun=true first.');
    }

    for (const parsed of parsedItems) {
      if (!parsed) continue;
      await this.prisma.$transaction(async (tx) => {
        const project = await tx.project.update({
          where: { id: projectId },
          data: { workItemCounter: { increment: 1 } },
          select: { name: true, workItemCounter: true },
        });
        const prefix = generateWorkItemPrefix(project.name);
        const displayId = `${prefix}${project.workItemCounter}`;
        await tx.workItem.create({
          data: {
            projectId, reporterId, displayId,
            type: parsed.type, title: parsed.title, description: parsed.description,
            priority: parsed.priority, parentId: parsed.parentId, sprintId: parsed.sprintId,
            assigneeId: parsed.assigneeId, storyPoints: parsed.storyPoints,
            estimatedHours: parsed.estimatedHours, labels: parsed.labels ?? [],
            billingStatus: parsed.billingStatus, startDate: parsed.startDate,
            dueDate: parsed.dueDate, releaseMilestoneId: parsed.releaseMilestoneId,
          },
        });
      });
    }

    return { results, success: true };
  }
}

export interface ImportRowResult {
  row: number;
  title: string;
  type: string;
  status: 'valid' | 'error';
  errors: string[];
}

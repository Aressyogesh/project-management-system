import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardStatus, ProjectRole, SystemRole, TaskPriority, WorkItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto, MoveWorkItemDto, UpdateWorkItemDto } from './dto/work-item.dto';

// Status ordering for determining forward vs backward transitions
const STATUS_ORDER: BoardStatus[] = [
  BoardStatus.TODO,
  BoardStatus.IN_PROGRESS,
  BoardStatus.BLOCKED,
  BoardStatus.IN_REVIEW,
  BoardStatus.QA,
  BoardStatus.QA_DONE,
];

// Valid parent types per child type
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
};

@Injectable()
export class WorkItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(
    projectId: string,
    filters: {
      type?: WorkItemType;
      sprintId?: string;
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
        ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.search && {
          title: { contains: filters.search, mode: 'insensitive' as const },
        }),
      },
      include: {
        assignee: { select: { id: true, fullName: true, profilePhoto: true } },
        reporter: { select: { id: true, fullName: true } },
        sprint: { select: { id: true, name: true } },
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

  async create(
    projectId: string,
    reporterId: string,
    dto: CreateWorkItemDto,
  ) {
    if (dto.parentId) {
      await this.validateParentType(dto.type, dto.parentId);
    }

    return this.prisma.workItem.create({
      data: {
        projectId,
        reporterId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        parentId: dto.parentId,
        sprintId: dto.sprintId,
        assigneeId: dto.assigneeId,
        storyPoints: dto.storyPoints,
        estimatedHours: dto.estimatedHours,
        labels: dto.labels ?? [],
        components: dto.components ?? [],
        fixVersion: dto.fixVersion,
        severity: dto.severity,
        bugClassification: dto.bugClassification,
        environment: dto.environment,
        stepsToRepro: dto.stepsToRepro,
        startDate: dto.startDate,
        dueDate: dto.dueDate,
        // Phase 9 bug fields
        bugFlag: dto.bugFlag,
        bugReproducibility: dto.bugReproducibility,
        bugStatus: dto.bugStatus,
        module: dto.module,
        responsibleUserId: dto.responsibleUserId,
        billingStatus: dto.billingStatus,
        affectedBuildVersion: dto.affectedBuildVersion,
        fixedBuildVersion: dto.fixedBuildVersion,
        reminderType: dto.reminderType,
        releaseMilestoneId: dto.releaseMilestoneId,
        affectedMilestoneId: dto.affectedMilestoneId,
      },
      include: ITEM_INCLUDE,
    });
  }

  async update(id: string, userId: string, userSystemRole: SystemRole, userProjectRole: ProjectRole | null, dto: UpdateWorkItemDto) {
    const item = await this.findOneOrFail(id);

    const isAdmin = userSystemRole === SystemRole.SUPER_USER || userSystemRole === SystemRole.ADMIN;
    const isPmOrTl = userProjectRole === ProjectRole.PROJECT_MANAGER || userProjectRole === ProjectRole.TEAM_LEAD;
    const isOwner = item.assigneeId === userId || item.reporterId === userId;

    if (!isAdmin && !isPmOrTl && !isOwner) {
      throw new ForbiddenException('You can only edit items assigned to or reported by you');
    }

    if (dto.parentId) {
      await this.validateParentType(dto.type ?? item.type, dto.parentId);
    }

    return this.prisma.workItem.update({
      where: { id },
      data: {
        ...dto,
        labels: dto.labels ?? undefined,
        components: dto.components ?? undefined,
      },
      include: {
        assignee: { select: { id: true, fullName: true, profilePhoto: true } },
        reporter: { select: { id: true, fullName: true } },
      },
    });
  }

  async move(id: string, dto: MoveWorkItemDto) {
    const item = await this.findOneOrFail(id);
    const fromIdx = STATUS_ORDER.indexOf(item.status);
    const toIdx = STATUS_ORDER.indexOf(dto.status);
    const isBackward = toIdx < fromIdx;
    const isCompletingNow = dto.status === BoardStatus.QA_DONE && item.status !== BoardStatus.QA_DONE;
    const isUncompletingNow = item.status === BoardStatus.QA_DONE && dto.status !== BoardStatus.QA_DONE;

    return this.prisma.workItem.update({
      where: { id },
      data: {
        status: dto.status,
        position: dto.position ?? 0,
        ...(isCompletingNow && { completedAt: new Date() }),
        ...(isUncompletingNow && { completedAt: null }),
        ...(isBackward && { reopenCount: { increment: 1 } }),
      },
    });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.workItem.delete({ where: { id } });
  }

  async addComment(workItemId: string, authorId: string, content: string) {
    await this.findOneOrFail(workItemId);
    return this.prisma.workItemComment.create({
      data: { workItemId, authorId, content },
      include: { author: { select: { id: true, fullName: true, profilePhoto: true } } },
    });
  }

  async removeComment(commentId: string, userId: string, systemRole: SystemRole) {
    const comment = await this.prisma.workItemComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    if (comment.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    return this.prisma.workItemComment.delete({ where: { id: commentId } });
  }

  private async validateParentType(childType: WorkItemType, parentId: string) {
    const validParents = VALID_PARENT_TYPES[childType];
    if (!validParents) return; // EPIC has no parent constraints (parentId would be null)

    const parent = await this.prisma.workItem.findUnique({
      where: { id: parentId },
      select: { type: true },
    });
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
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async getProjectWebhookUrl(projectId: string): Promise<string | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { teamsWebhookUrl: true },
    });
    return project?.teamsWebhookUrl ?? null;
  }

  private itemMeta(type: string): { itemType: string; itemIcon: string } {
    const map: Record<string, { itemType: string; itemIcon: string }> = {
      BUG:        { itemType: 'Bug',        itemIcon: '🐛' },
      TASK:       { itemType: 'Task',       itemIcon: '🎯' },
      USER_STORY: { itemType: 'User Story', itemIcon: '📖' },
      SUB_TASK:   { itemType: 'Sub Task',   itemIcon: '🔧' },
      EPIC:       { itemType: 'Epic',       itemIcon: '⚡' },
    };
    return map[type] ?? { itemType: type, itemIcon: '📋' };
  }

  // Scenario 1 — Bug created
  notifyBugCreated(item: {
    id: string;
    displayId: string;
    title: string;
    type: string;
    severity?: string | null;
    priority: string;
    status: string;
    projectId: string;
    description?: string | null;
    storyPoints?: number | null;
    estimatedHours?: unknown;
    labels?: string[];
    components?: string[];
    fixVersion?: string | null;
    bugClassification?: string | null;
    environment?: string | null;
    stepsToRepro?: string | null;
    bugReproducibility?: string | null;
    bugStatus?: string | null;
    bugFlag?: string | null;
    module?: string | null;
    billingStatus?: string | null;
    affectedBuildVersion?: string | null;
    fixedBuildVersion?: string | null;
    startDate?: Date | null;
    dueDate?: Date | null;
    assignee?: { id: string; fullName: string; profilePhoto?: string | null } | null;
    reporter?: { id: string; fullName: string; profilePhoto?: string | null } | null;
    responsibleUser?: { id: string; fullName: string } | null;
    sprint?: { id: string; name: string } | null;
    parent?: { id: string; title: string; type: string } | null;
    releaseMilestone?: { id: string; description: string | null } | null;
    affectedMilestone?: { id: string; description: string | null } | null;
    createdAt: Date;
  }): void {
    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        this.post(url, {
          event: 'BUG_CREATED',
          payload: {
            id: item.id,
            displayId: item.displayId,
            title: item.title,
            severity: item.severity,
            priority: item.priority,
            status: item.status,
            projectId: item.projectId,
            environment: item.environment,
            assigneeName: item.assignee?.fullName ?? 'Unassigned',
            reporterName: item.reporter?.fullName ?? 'Unknown',
            dueDate: item.dueDate
              ? item.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Not set',
            createdAt: item.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          },
        });
      })
      .catch((err) => this.logger.warn(`notifyBugCreated failed: ${err.message}`));
  }

  // Scenario 2 — Sprint started
  notifySprintStarted(sprintId: string, projectId: string, activatedByUserId: string): void {
    Promise.all([
      this.prisma.sprint.findUnique({ where: { id: sprintId } }),
      this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true, teamsWebhookUrl: true } }),
      this.prisma.projectMember.findMany({
        where: { projectId },
        include: { user: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.user.findUnique({ where: { id: activatedByUserId }, select: { fullName: true } }),
    ])
      .then(([sprint, project, members, activatedBy]) => {
        if (!project?.teamsWebhookUrl) return;
        this.post(project.teamsWebhookUrl, {
          event: 'SPRINT_STARTED',
          payload: {
            id: sprint?.id,
            name: sprint?.name,
            goal: sprint?.goal ?? 'No goal set',
            startDate: sprint?.startDate
              ? new Date(sprint.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Not set',
            endDate: sprint?.endDate
              ? new Date(sprint.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Not set',
            projectId,
            projectName: project?.name,
            activatedBy: activatedBy?.fullName,
            memberCount: members.length,
          },
        });
      })
      .catch((err) => this.logger.warn(`notifySprintStarted failed: ${err.message}`));
  }

  // Scenario 7 — Task/item assigned
  notifyTaskAssigned(item: {
    id: string;
    displayId: string;
    title: string;
    type: string;
    priority: string;
    dueDate?: Date | null;
    estimatedHours?: any;
    projectId: string;
  }, assignee: { id: string; fullName: string }, assignedBy: { fullName: string }): void {
    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        this.post(url, {
          event: 'TASK_ASSIGNED',
          payload: {
            id: item.id,
            displayId: item.displayId,
            title: item.title,
            type: item.type,
            ...this.itemMeta(item.type),
            priority: item.priority,
            dueDate: item.dueDate
              ? item.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Not set',
            estimatedHours: item.estimatedHours != null ? `${item.estimatedHours} hrs` : 'Not set',
            projectId: item.projectId,
            assigneeName: assignee.fullName,
            assignedBy: assignedBy.fullName,
          },
        });
      })
      .catch((err) => this.logger.warn(`notifyTaskAssigned failed: ${err.message}`));
  }

  // Scenario 8 — Critical bug created
  notifyCriticalBug(item: {
    id: string;
    displayId: string;
    title: string;
    severity: string;
    priority: string;
    projectId: string;
    description?: string | null;
    environment?: string | null;
    stepsToRepro?: string | null;
    assignee?: { id: string; fullName: string } | null;
    reporter?: { id: string; fullName: string } | null;
    createdAt: Date;
  }): void {
    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        this.post(url, {
          event: 'CRITICAL_BUG_CREATED',
          payload: {
            id: item.id,
            displayId: item.displayId,
            title: item.title,
            severity: item.severity,
            priority: item.priority,
            projectId: item.projectId,
            environment: item.environment ?? 'Not specified',
            stepsToRepro: item.stepsToRepro ?? 'Not provided',
            assigneeName: item.assignee?.fullName ?? 'Unassigned',
            reporterName: item.reporter?.fullName ?? 'Unknown',
          },
        });
      })
      .catch((err) => this.logger.warn(`notifyCriticalBug failed: ${err.message}`));
  }

  // Scenario 9 — Bug reopened
  notifyBugReopened(item: {
    id: string;
    displayId: string;
    title: string;
    projectId: string;
    reopenCount: number;
    assignee?: { id: string; fullName: string } | null;
    reporter?: { id: string; fullName: string } | null;
  }, reopenedBy: { fullName: string }): void {
    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        this.post(url, {
          event: 'BUG_REOPENED',
          payload: {
            id: item.id,
            displayId: item.displayId,
            title: item.title,
            projectId: item.projectId,
            reopenCount: item.reopenCount,
            assigneeName: item.assignee?.fullName ?? 'Unassigned',
            reopenedBy: reopenedBy.fullName,
          },
        });
      })
      .catch((err) => this.logger.warn(`notifyBugReopened failed: ${err.message}`));
  }

  // Scenario 10 — Item blocked
  notifyItemBlocked(item: {
    id: string;
    displayId: string;
    title: string;
    type: string;
    projectId: string;
    assignee?: { id: string; fullName: string } | null;
  }, blockedBy: { fullName: string }): void {
    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        this.post(url, {
          event: 'ITEM_BLOCKED',
          payload: {
            id: item.id,
            displayId: item.displayId,
            title: item.title,
            type: item.type,
            ...this.itemMeta(item.type),
            projectId: item.projectId,
            assigneeName: item.assignee?.fullName ?? 'Unassigned',
            blockedBy: blockedBy.fullName,
          },
        });
      })
      .catch((err) => this.logger.warn(`notifyItemBlocked failed: ${err.message}`));
  }

  // Scenario 6 — Node-RED: work item status changed (unchanged)
  notifyWorkItemStatusChanged(
    item: {
      id: string;
      displayId: string;
      title: string;
      type: string;
      status: string;
      projectId: string;
      assignee?: { id: string; fullName: string } | null;
    },
    previousStatus: string,
    changedByUserId: string,
  ): void {
    const webhook = this.config.get<string>(
      'AUTOMATION_NODERED_WEBHOOK',
      'http://host.docker.internal:19103/webhook/pms',
    );
    this.post(webhook, {
      event: 'WORK_ITEM_STATUS_CHANGED',
      payload: {
        id: item.id,
        displayId: item.displayId,
        title: item.title,
        type: item.type,
        previousStatus,
        newStatus: item.status,
        projectId: item.projectId,
        assignee: item.assignee,
        changedByUserId,
      },
    });
  }

  private post(url: string, body: unknown): void {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch((err) => this.logger.warn(`Automation webhook failed [${url}]: ${err.message}`));
  }
}

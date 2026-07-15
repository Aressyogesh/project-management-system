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

  // Scenario 1 — Activepieces: new BUG work item created
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
    const webhookId = this.config.get<string>('AP_BUG_WEBHOOK_ID');
    if (!webhookId) return;
    const base = this.config.get<string>('AUTOMATION_AP_BASE', 'http://localhost:19102');
    this.post(`${base}/api/v1/webhooks/${webhookId}`, { event: 'BUG_CREATED', payload: item });
  }

  // Scenario 2 — Activepieces: sprint activated → email all members
  notifySprintStarted(sprintId: string, projectId: string, activatedByUserId: string): void {
    const webhookId = this.config.get<string>('AP_SPRINT_WEBHOOK_ID');
    if (!webhookId) return;
    const base = this.config.get<string>('AUTOMATION_AP_BASE', 'http://host.docker.internal:19102');

    // Resolve sprint + members then fire — non-blocking
    Promise.all([
      this.prisma.sprint.findUnique({ where: { id: sprintId } }),
      this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
      this.prisma.projectMember.findMany({
        where: { projectId },
        include: { user: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: activatedByUserId },
        select: { fullName: true },
      }),
    ])
      .then(([sprint, project, members, activatedBy]) => {
        this.post(`${base}/api/v1/webhooks/${webhookId}`, {
          event: 'SPRINT_STARTED',
          payload: {
            id: sprint?.id,
            name: sprint?.name,
            goal: sprint?.goal,
            startDate: sprint?.startDate,
            endDate: sprint?.endDate,
            projectId,
            projectName: project?.name,
            activatedBy: activatedBy?.fullName,
            members: members.map((m) => ({
              id: m.user.id,
              fullName: m.user.fullName,
              email: m.user.email,
            })),
          },
        });
      })
      .catch((err) => this.logger.warn(`notifySprintStarted lookup failed: ${err.message}`));
  }

  // Scenario 7 — Activepieces: work item assigned to a user
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
    const webhookId = this.config.get<string>('AP_TASK_ASSIGNED_WEBHOOK_ID');
    if (!webhookId) return;
    const base = this.config.get<string>('AUTOMATION_AP_BASE', 'http://localhost:19102');
    this.post(`${base}/api/v1/webhooks/${webhookId}`, {
      event: 'TASK_ASSIGNED',
      payload: {
        id: item.id,
        displayId: item.displayId,
        title: item.title,
        type: item.type,
        priority: item.priority,
        dueDate: item.dueDate ? item.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set',
        estimatedHours: item.estimatedHours != null ? `${item.estimatedHours} hrs` : 'Not set',
        projectId: item.projectId,
        assignee,
        assignedBy: assignedBy.fullName,
      },
    });
  }

  // Scenario 8 — Activepieces: critical severity bug created
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
    const webhookId = this.config.get<string>('AP_CRITICAL_BUG_WEBHOOK_ID');
    if (!webhookId) return;
    const base = this.config.get<string>('AUTOMATION_AP_BASE', 'http://localhost:19102');
    this.post(`${base}/api/v1/webhooks/${webhookId}`, { event: 'CRITICAL_BUG_CREATED', payload: item });
  }

  // Scenario 9 — Activepieces: bug reopened (status moved back from QA_DONE)
  notifyBugReopened(item: {
    id: string;
    displayId: string;
    title: string;
    projectId: string;
    reopenCount: number;
    assignee?: { id: string; fullName: string } | null;
    reporter?: { id: string; fullName: string } | null;
  }, reopenedBy: { fullName: string }): void {
    const webhookId = this.config.get<string>('AP_BUG_REOPENED_WEBHOOK_ID');
    if (!webhookId) return;
    const base = this.config.get<string>('AUTOMATION_AP_BASE', 'http://localhost:19102');
    this.post(`${base}/api/v1/webhooks/${webhookId}`, {
      event: 'BUG_REOPENED',
      payload: {
        id: item.id,
        displayId: item.displayId,
        title: item.title,
        projectId: item.projectId,
        reopenCount: item.reopenCount,
        assignee: item.assignee,
        reporter: item.reporter,
        reopenedBy: reopenedBy.fullName,
      },
    });
  }

  // Scenario 10 — Activepieces: work item status changed to BLOCKED
  notifyItemBlocked(item: {
    id: string;
    displayId: string;
    title: string;
    type: string;
    projectId: string;
    assignee?: { id: string; fullName: string } | null;
  }, blockedBy: { fullName: string }): void {
    const webhookId = this.config.get<string>('AP_ITEM_BLOCKED_WEBHOOK_ID');
    if (!webhookId) return;
    const base = this.config.get<string>('AUTOMATION_AP_BASE', 'http://localhost:19102');
    this.post(`${base}/api/v1/webhooks/${webhookId}`, {
      event: 'ITEM_BLOCKED',
      payload: {
        id: item.id,
        displayId: item.displayId,
        title: item.title,
        type: item.type,
        projectId: item.projectId,
        assignee: item.assignee,
        blockedBy: blockedBy.fullName,
      },
    });
  }

  // Scenario 6 — Node-RED: work item status changed
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

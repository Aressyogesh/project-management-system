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

  private priorityColor(priority: string): string {
    const map: Record<string, string> = {
      CRITICAL: 'Attention',
      HIGH:     'Warning',
      MEDIUM:   'Accent',
      LOW:      'Good',
    };
    return map[priority] ?? 'Default';
  }

  private priorityIcon(priority: string): string {
    const map: Record<string, string> = {
      CRITICAL: '🔴',
      HIGH:     '🟠',
      MEDIUM:   '🟡',
      LOW:      '🟢',
    };
    return map[priority] ?? '⚪';
  }

  private severityColor(severity: string): string {
    const map: Record<string, string> = {
      SHOW_STOPPER: 'Attention',
      BLOCKER:      'Attention',
      CRITICAL:     'Attention',
      MAJOR:        'Warning',
      MINOR:        'Accent',
      TRIVIAL:      'Good',
    };
    return map[severity] ?? 'Default';
  }

  private severityIcon(severity: string): string {
    const map: Record<string, string> = {
      SHOW_STOPPER: '🚨',
      BLOCKER:      '🚨',
      CRITICAL:     '🚨',
      MAJOR:        '🔥',
      MINOR:        '⚠️',
      TRIVIAL:      '🔵',
    };
    return map[severity] ?? '⚪';
  }

  // Scenario 2 — Bug created (posts Adaptive Card directly to Teams)
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
    assignee?: { id: string; fullName: string; email?: string | null; profilePhoto?: string | null } | null;
    reporter?: { id: string; fullName: string; profilePhoto?: string | null } | null;
    responsibleUser?: { id: string; fullName: string } | null;
    sprint?: { id: string; name: string } | null;
    parent?: { id: string; title: string; type: string } | null;
    releaseMilestone?: { id: string; description: string | null } | null;
    affectedMilestone?: { id: string; description: string | null } | null;
    createdAt: Date;
  }): void {
    const severity   = item.severity ?? 'Not set';
    const dueDateStr = item.dueDate
      ? item.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Not set';
    const envFlagMap: Record<string, string> = { INTERNAL: 'Development', EXTERNAL: 'Production', STAGING: 'Staging' };
    const environmentStr = item.environment || (item.bugFlag ? (envFlagMap[item.bugFlag] ?? item.bugFlag) : 'Not specified');

    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        const mention = this.buildMention(item.assignee, 'a bug has been assigned to you');
        if (mention) this.post(url, { type: 'message', text: mention.outerText, entities: mention.entities });
        this.post(url, {
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              type: 'AdaptiveCard',
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              version: '1.4',
              body: [
                // ── Header ──────────────────────────────────────────────
                {
                  type: 'ColumnSet',
                  style: 'warning',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [{ type: 'TextBlock', text: '🐛', size: 'ExtraLarge', wrap: false }],
                      verticalContentAlignment: 'Center',
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'PMS — Bug Created', weight: 'Bolder', size: 'Large', color: 'Accent', wrap: true, spacing: 'None' },
                        { type: 'TextBlock', text: 'Project Management System', size: 'Small', color: 'Accent', isSubtle: true, spacing: 'None', wrap: false },
                      ],
                      verticalContentAlignment: 'Center',
                    },
                  ],
                },
                // spacer
                { type: 'TextBlock', text: ' ', spacing: 'Medium', size: 'Small' },
                // ── Bug title ───────────────────────────────────────────
                {
                  type: 'Container',
                  style: 'emphasis',
                  items: [
                    { type: 'TextBlock', text: 'BUG', size: 'Small', weight: 'Bolder', color: 'Attention', spacing: 'None' },
                    { type: 'TextBlock', text: item.title, size: 'Medium', weight: 'Bolder', wrap: true, spacing: 'Small' },
                    { type: 'TextBlock', text: item.displayId, size: 'Small', isSubtle: true, fontType: 'Monospace', spacing: 'Small' },
                  ],
                },
                // ── Severity · Priority ──────────────────────────────────
                {
                  type: 'ColumnSet',
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'SEVERITY', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `${this.severityIcon(severity)} ${severity}`, color: this.severityColor(severity), weight: 'Bolder', spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'PRIORITY', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `${this.priorityIcon(item.priority)} ${item.priority}`, color: this.priorityColor(item.priority), weight: 'Bolder', spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'ENVIRONMENT', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: environmentStr, spacing: 'Small', wrap: true },
                      ],
                    },
                  ],
                },
                // ── Assignee · Reporter ──────────────────────────────────
                {
                  type: 'ColumnSet',
                  separator: true,
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'ASSIGNEE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `👤 ${item.assignee?.fullName ?? 'Unassigned'}`, color: 'Good', weight: 'Bolder', spacing: 'Small', wrap: true },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'REPORTER', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: item.reporter?.fullName ?? 'Unknown', spacing: 'Small', wrap: true, isSubtle: true },
                      ],
                    },
                  ],
                },
                // ── Due date ─────────────────────────────────────────────
                {
                  type: 'ColumnSet',
                  separator: true,
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'DUE DATE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `📅 ${dueDateStr}`, spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'SPRINT', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: item.sprint?.name ?? 'Not assigned', spacing: 'Small', wrap: true, isSubtle: true },
                      ],
                    },
                  ],
                },
              ],
            },
          }],
        });
      })
      .catch((err) => this.logger.warn(`notifyBugCreated failed: ${err.message}`));
  }

  // Scenario 6 — Sprint started (posts Adaptive Card directly to Teams)
  notifySprintStarted(sprintId: string, projectId: string, activatedByUserId: string): void {
    Promise.all([
      this.prisma.sprint.findUnique({ where: { id: sprintId } }),
      this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true, teamsWebhookUrl: true } }),
      this.prisma.workItem.count({ where: { sprintId, projectId } }),
      this.prisma.user.findUnique({ where: { id: activatedByUserId }, select: { fullName: true } }),
    ])
      .then(([sprint, project, itemCount, activatedBy]) => {
        if (!project?.teamsWebhookUrl) return;
        const startDateStr = sprint?.startDate
          ? new Date(sprint.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Not set';
        const endDateStr = sprint?.endDate
          ? new Date(sprint.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Not set';

        this.post(project.teamsWebhookUrl, {
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              type: 'AdaptiveCard',
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              version: '1.4',
              body: [
                // ── Header ──────────────────────────────────────────────
                {
                  type: 'ColumnSet',
                  style: 'good',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [{ type: 'TextBlock', text: '🚀', size: 'ExtraLarge', wrap: false }],
                      verticalContentAlignment: 'Center',
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'PMS — Sprint Started', weight: 'Bolder', size: 'Large', color: 'Accent', wrap: true, spacing: 'None' },
                        { type: 'TextBlock', text: project.name ?? 'Project Management System', size: 'Small', color: 'Accent', isSubtle: true, spacing: 'None', wrap: false },
                      ],
                      verticalContentAlignment: 'Center',
                    },
                  ],
                },
                // spacer
                { type: 'TextBlock', text: ' ', spacing: 'Medium', size: 'Small' },
                // ── Sprint name + goal ────────────────────────────────────
                {
                  type: 'Container',
                  style: 'emphasis',
                  items: [
                    { type: 'TextBlock', text: 'SPRINT', size: 'Small', weight: 'Bolder', color: 'Good', spacing: 'None' },
                    { type: 'TextBlock', text: sprint?.name ?? 'Sprint', size: 'Medium', weight: 'Bolder', wrap: true, spacing: 'Small' },
                    { type: 'TextBlock', text: sprint?.goal ?? 'No goal set', size: 'Small', isSubtle: true, wrap: true, spacing: 'Small' },
                  ],
                },
                // ── Start · End dates ────────────────────────────────────
                {
                  type: 'ColumnSet',
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'START DATE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `📅 ${startDateStr}`, weight: 'Bolder', color: 'Good', spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'END DATE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `📅 ${endDateStr}`, weight: 'Bolder', color: 'Warning', spacing: 'Small', wrap: false },
                      ],
                    },
                  ],
                },
                // ── Items · Activated by ─────────────────────────────────
                {
                  type: 'ColumnSet',
                  separator: true,
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'WORK ITEMS', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `📋 ${itemCount}`, weight: 'Bolder', spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'STARTED BY', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: activatedBy?.fullName ?? 'Someone', spacing: 'Small', wrap: true, isSubtle: true },
                      ],
                    },
                  ],
                },
              ],
            },
          }],
        });
      })
      .catch((err) => this.logger.warn(`notifySprintStarted failed: ${err.message}`));
  }

  // Scenario 1 — Task/item assigned (posts Adaptive Card directly to Teams)
  notifyTaskAssigned(item: {
    id: string;
    displayId: string;
    title: string;
    type: string;
    priority: string;
    dueDate?: Date | null;
    estimatedHours?: any;
    projectId: string;
  }, assignee: { id: string; fullName: string; email?: string | null }, assignedBy: { fullName: string }): void {
    const { itemType, itemIcon } = this.itemMeta(item.type);
    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        const dueDateStr = item.dueDate
          ? item.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Not set';
        const estHoursStr = item.estimatedHours != null ? `${item.estimatedHours} hrs` : 'Not set';
        const mention = this.buildMention(assignee, 'a work item has been assigned to you');
        if (mention) this.post(url, { type: 'message', text: mention.outerText, entities: mention.entities });
        this.post(url, {
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              type: 'AdaptiveCard',
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              version: '1.4',
              body: [
                // ── Header ────────────────────────────────────────────────
                {
                  type: 'ColumnSet',
                  style: 'accent',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [{ type: 'TextBlock', text: '📋', size: 'ExtraLarge', wrap: false }],
                      verticalContentAlignment: 'Center',
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'PMS — Work Item Assigned', weight: 'Bolder', size: 'Large', color: 'Accent', wrap: true, spacing: 'None' },
                        { type: 'TextBlock', text: 'Project Management System', size: 'Small', color: 'Accent', isSubtle: true, spacing: 'None', wrap: false },
                      ],
                      verticalContentAlignment: 'Center',
                    },
                  ],
                },
                // spacer
                { type: 'TextBlock', text: ' ', spacing: 'Medium', size: 'Small' },
                // ── Work item title ───────────────────────────────────────
                {
                  type: 'Container',
                  style: 'emphasis',
                  items: [
                    { type: 'TextBlock', text: 'WORK ITEM', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                    { type: 'TextBlock', text: item.title, size: 'Medium', weight: 'Bolder', wrap: true, spacing: 'Small' },
                    { type: 'TextBlock', text: item.displayId, size: 'Small', isSubtle: true, fontType: 'Monospace', spacing: 'Small' },
                  ],
                  spacing: 'None',
                },
                // ── Assignee row ──────────────────────────────────────────
                {
                  type: 'ColumnSet',
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'ASSIGNED TO', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `👤 ${assignee.fullName}`, weight: 'Bolder', size: 'Medium', color: 'Good', wrap: true, spacing: 'Small' },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'ASSIGNED BY', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: assignedBy.fullName, wrap: true, spacing: 'Small', isSubtle: true },
                      ],
                    },
                  ],
                },
                // ── Type · Priority row ───────────────────────────────────
                {
                  type: 'ColumnSet',
                  separator: true,
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'TYPE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `${itemIcon} ${itemType}`, spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'PRIORITY', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `${this.priorityIcon(item.priority)} ${item.priority}`, color: this.priorityColor(item.priority), weight: 'Bolder', spacing: 'Small', wrap: false },
                      ],
                    },
                  ],
                },
                // ── Est Hours · Due Date row ──────────────────────────────
                {
                  type: 'ColumnSet',
                  spacing: 'Small',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'EST. HOURS', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `⏱ ${estHoursStr}`, spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'DUE DATE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `📅 ${dueDateStr}`, spacing: 'Small', wrap: false },
                      ],
                    },
                  ],
                },
              ],
            },
          }],
        });
      })
      .catch((err) => this.logger.warn(`notifyTaskAssigned failed: ${err.message}`));
  }

  // Scenario 3 — Critical bug created (posts Adaptive Card directly to Teams)
  notifyCriticalBug(item: {
    id: string;
    displayId: string;
    title: string;
    severity: string;
    priority: string;
    projectId: string;
    description?: string | null;
    environment?: string | null;
    bugFlag?: string | null;
    stepsToRepro?: string | null;
    assignee?: { id: string; fullName: string; email?: string | null } | null;
    reporter?: { id: string; fullName: string } | null;
    createdAt: Date;
  }): void {
    const envFlagMap: Record<string, string> = { INTERNAL: 'Development', EXTERNAL: 'Production', STAGING: 'Staging' };
    const environmentStr = item.environment || (item.bugFlag ? (envFlagMap[item.bugFlag] ?? item.bugFlag) : 'Not specified');

    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        const mention = this.buildMention(item.assignee, 'a critical bug requires your attention');
        if (mention) this.post(url, { type: 'message', text: mention.outerText, entities: mention.entities });
        this.post(url, {
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              type: 'AdaptiveCard',
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              version: '1.4',
              body: [
                // ── Header ──────────────────────────────────────────────
                {
                  type: 'ColumnSet',
                  style: 'attention',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [{ type: 'TextBlock', text: '🚨', size: 'ExtraLarge', wrap: false }],
                      verticalContentAlignment: 'Center',
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'PMS — CRITICAL Bug Alert!', weight: 'Bolder', size: 'Large', color: 'Accent', wrap: true, spacing: 'None' },
                        { type: 'TextBlock', text: 'Project Management System', size: 'Small', color: 'Accent', isSubtle: true, spacing: 'None', wrap: false },
                      ],
                      verticalContentAlignment: 'Center',
                    },
                  ],
                },
                // spacer
                { type: 'TextBlock', text: ' ', spacing: 'Medium', size: 'Small' },
                // ── Bug title ───────────────────────────────────────────
                {
                  type: 'Container',
                  style: 'emphasis',
                  items: [
                    { type: 'TextBlock', text: '🚨 CRITICAL BUG', size: 'Small', weight: 'Bolder', color: 'Attention', spacing: 'None' },
                    { type: 'TextBlock', text: item.title, size: 'Medium', weight: 'Bolder', wrap: true, spacing: 'Small' },
                    { type: 'TextBlock', text: item.displayId, size: 'Small', isSubtle: true, fontType: 'Monospace', spacing: 'Small' },
                  ],
                },
                // ── Severity · Priority · Environment ────────────────────
                {
                  type: 'ColumnSet',
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'SEVERITY', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `${this.severityIcon(item.severity)} ${item.severity}`, color: this.severityColor(item.severity), weight: 'Bolder', spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'PRIORITY', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `${this.priorityIcon(item.priority)} ${item.priority}`, color: this.priorityColor(item.priority), weight: 'Bolder', spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'ENVIRONMENT', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: environmentStr, spacing: 'Small', wrap: true },
                      ],
                    },
                  ],
                },
                // ── Assignee · Reporter ──────────────────────────────────
                {
                  type: 'ColumnSet',
                  separator: true,
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'ASSIGNEE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `👤 ${item.assignee?.fullName ?? 'Unassigned'}`, color: 'Good', weight: 'Bolder', spacing: 'Small', wrap: true },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'REPORTER', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: item.reporter?.fullName ?? 'Unknown', spacing: 'Small', wrap: true, isSubtle: true },
                      ],
                    },
                  ],
                },
                // ── Steps to repro ────────────────────────────────────────
                ...(item.stepsToRepro ? [{
                  type: 'Container',
                  separator: true,
                  spacing: 'Medium' as const,
                  items: [
                    { type: 'TextBlock', text: 'STEPS TO REPRODUCE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                    { type: 'TextBlock', text: item.stepsToRepro, wrap: true, spacing: 'Small', isSubtle: true },
                  ],
                }] : []),
              ],
            },
          }],
        });
      })
      .catch((err) => this.logger.warn(`notifyCriticalBug failed: ${err.message}`));
  }

  // Scenario 4 — Bug reopened (posts Adaptive Card directly to Teams)
  notifyBugReopened(item: {
    id: string;
    displayId: string;
    title: string;
    projectId: string;
    reopenCount: number;
    assignee?: { id: string; fullName: string; email?: string | null } | null;
    reporter?: { id: string; fullName: string } | null;
  }, reopenedBy: { fullName: string }): void {
    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        const mention = this.buildMention(item.assignee, 'a bug assigned to you has been reopened');
        if (mention) this.post(url, { type: 'message', text: mention.outerText, entities: mention.entities });
        this.post(url, {
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              type: 'AdaptiveCard',
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              version: '1.4',
              body: [
                // ── Header ──────────────────────────────────────────────
                {
                  type: 'ColumnSet',
                  style: 'warning',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [{ type: 'TextBlock', text: '🔁', size: 'ExtraLarge', wrap: false }],
                      verticalContentAlignment: 'Center',
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'PMS — Bug Reopened', weight: 'Bolder', size: 'Large', color: 'Accent', wrap: true, spacing: 'None' },
                        { type: 'TextBlock', text: 'Project Management System', size: 'Small', color: 'Accent', isSubtle: true, spacing: 'None', wrap: false },
                      ],
                      verticalContentAlignment: 'Center',
                    },
                  ],
                },
                // spacer
                { type: 'TextBlock', text: ' ', spacing: 'Medium', size: 'Small' },
                // ── Bug title ───────────────────────────────────────────
                {
                  type: 'Container',
                  style: 'emphasis',
                  items: [
                    { type: 'TextBlock', text: 'BUG', size: 'Small', weight: 'Bolder', color: 'Warning', spacing: 'None' },
                    { type: 'TextBlock', text: item.title, size: 'Medium', weight: 'Bolder', wrap: true, spacing: 'Small' },
                    { type: 'TextBlock', text: item.displayId, size: 'Small', isSubtle: true, fontType: 'Monospace', spacing: 'Small' },
                  ],
                },
                // ── Reopen count · Reopened by ────────────────────────────
                {
                  type: 'ColumnSet',
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'REOPEN COUNT', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `🔁 ${item.reopenCount}x`, weight: 'Bolder', color: 'Warning', spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'REOPENED BY', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: reopenedBy.fullName, spacing: 'Small', wrap: true, isSubtle: true },
                      ],
                    },
                  ],
                },
                // ── Assignee · Reporter ──────────────────────────────────
                {
                  type: 'ColumnSet',
                  separator: true,
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'ASSIGNEE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `👤 ${item.assignee?.fullName ?? 'Unassigned'}`, color: 'Good', weight: 'Bolder', spacing: 'Small', wrap: true },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'REPORTER', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: item.reporter?.fullName ?? 'Unknown', spacing: 'Small', wrap: true, isSubtle: true },
                      ],
                    },
                  ],
                },
              ],
            },
          }],
        });
      })
      .catch((err) => this.logger.warn(`notifyBugReopened failed: ${err.message}`));
  }

  // Scenario 5 — Item blocked (posts Adaptive Card directly to Teams)
  notifyItemBlocked(item: {
    id: string;
    displayId: string;
    title: string;
    type: string;
    projectId: string;
    assignee?: { id: string; fullName: string; email?: string | null } | null;
  }, blockedBy: { fullName: string }): void {
    const { itemType, itemIcon } = this.itemMeta(item.type);
    this.getProjectWebhookUrl(item.projectId)
      .then((url) => {
        if (!url) return;
        const mention = this.buildMention(item.assignee, 'a work item assigned to you is blocked');
        if (mention) this.post(url, { type: 'message', text: mention.outerText, entities: mention.entities });
        this.post(url, {
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              type: 'AdaptiveCard',
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              version: '1.4',
              body: [
                // ── Header ──────────────────────────────────────────────
                {
                  type: 'ColumnSet',
                  style: 'attention',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [{ type: 'TextBlock', text: '🚧', size: 'ExtraLarge', wrap: false }],
                      verticalContentAlignment: 'Center',
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'PMS — Item Blocked', weight: 'Bolder', size: 'Large', color: 'Accent', wrap: true, spacing: 'None' },
                        { type: 'TextBlock', text: 'Project Management System', size: 'Small', color: 'Accent', isSubtle: true, spacing: 'None', wrap: false },
                      ],
                      verticalContentAlignment: 'Center',
                    },
                  ],
                },
                // spacer
                { type: 'TextBlock', text: ' ', spacing: 'Medium', size: 'Small' },
                // ── Work item title ───────────────────────────────────────
                {
                  type: 'Container',
                  style: 'emphasis',
                  items: [
                    { type: 'TextBlock', text: `${itemIcon} ${itemType.toUpperCase()}`, size: 'Small', weight: 'Bolder', color: 'Attention', spacing: 'None' },
                    { type: 'TextBlock', text: item.title, size: 'Medium', weight: 'Bolder', wrap: true, spacing: 'Small' },
                    { type: 'TextBlock', text: item.displayId, size: 'Small', isSubtle: true, fontType: 'Monospace', spacing: 'Small' },
                  ],
                },
                // ── Status · Type ────────────────────────────────────────
                {
                  type: 'ColumnSet',
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'STATUS', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: '🚧 BLOCKED', weight: 'Bolder', color: 'Attention', spacing: 'Small', wrap: false },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'TYPE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `${itemIcon} ${itemType}`, spacing: 'Small', wrap: false },
                      ],
                    },
                  ],
                },
                // ── Assignee · Blocked by ─────────────────────────────────
                {
                  type: 'ColumnSet',
                  separator: true,
                  spacing: 'Medium',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'ASSIGNEE', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: `👤 ${item.assignee?.fullName ?? 'Unassigned'}`, color: 'Good', weight: 'Bolder', spacing: 'Small', wrap: true },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        { type: 'TextBlock', text: 'BLOCKED BY', size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
                        { type: 'TextBlock', text: blockedBy.fullName, spacing: 'Small', wrap: true, isSubtle: true },
                      ],
                    },
                  ],
                },
              ],
            },
          }],
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

  private buildMention(
    user: { fullName: string; email?: string | null } | null | undefined,
    context: string,
  ): { outerText: string; entities: object[]; displayText: string } | null {
    if (!user?.email) return null;
    const tag = `<at>${user.fullName}</at>`;
    return {
      outerText: `${tag} — ${context}`,
      entities: [{ type: 'mention', text: tag, mentioned: { id: user.email, name: user.fullName } }],
      displayText: `@${user.fullName} — ${context}`,
    };
  }

  private post(url: string, body: unknown): void {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch((err) => this.logger.warn(`Automation webhook failed [${url}]: ${err.message}`));
  }
}

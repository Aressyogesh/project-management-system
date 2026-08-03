import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BoardStatus, BugReminderType, LeaveStatus, MilestoneStatus, ProjectRole, ProjectStatus, SystemRole, WorkItemType } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── KPI digest helpers ────────────────────────────────────────────────────────

interface KpiMetricInfo {
  name: string;
  maxPoints: number;
  coreValue: string;
  subCategory: string | null;
  badge: 'AUTO' | 'MANUAL' | 'SELF';
}

const METRIC_INFO: Record<string, KpiMetricInfo> = {
  sprint_reliability:        { name: 'Sprint Reliability',               maxPoints: 10, coreValue: 'Diligent and Committed', subCategory: 'Delivery & Execution',             badge: 'AUTO'   },
  delivery_timeliness:       { name: 'Delivery Timeliness',              maxPoints: 10, coreValue: 'Diligent and Committed', subCategory: 'Delivery & Execution',             badge: 'AUTO'   },
  estimation_accuracy:       { name: 'Estimation Accuracy',              maxPoints: 10, coreValue: 'Diligent and Committed', subCategory: 'Delivery & Execution',             badge: 'AUTO'   },
  throughput_complexity:     { name: 'Throughput & Complexity Handling',  maxPoints: 10, coreValue: 'Diligent and Committed', subCategory: 'Delivery & Execution',             badge: 'AUTO'   },
  internal_rework_ratio:     { name: 'Internal Rework Ratio',            maxPoints: 5,  coreValue: 'Diligent and Committed', subCategory: 'Quality & Engineering Excellence', badge: 'AUTO'   },
  technical_defect_leakage:  { name: 'Technical Defect Leakage',         maxPoints: 10, coreValue: 'Diligent and Committed', subCategory: 'Quality & Engineering Excellence', badge: 'AUTO'   },
  functional_defect_leakage: { name: 'Functional Defect Leakage',        maxPoints: 10, coreValue: 'Diligent and Committed', subCategory: 'Quality & Engineering Excellence', badge: 'AUTO'   },
  attendance:                { name: 'Attendance',                       maxPoints: 5,  coreValue: 'Diligent and Committed', subCategory: 'Attendance',                       badge: 'AUTO'   },
  timeliness:                { name: 'Timeliness',                       maxPoints: 5,  coreValue: 'Diligent and Committed', subCategory: 'Attendance',                       badge: 'AUTO'   },
  team_collaboration:        { name: 'Team Collaboration',               maxPoints: 5,  coreValue: 'Collaboration',          subCategory: null,                               badge: 'MANUAL' },
  reporting_documentation:   { name: 'Reporting & Documentation',        maxPoints: 5,  coreValue: 'Collaboration',          subCategory: null,                               badge: 'MANUAL' },
  learning_velocity:         { name: 'Learning Velocity',                maxPoints: 5,  coreValue: 'Continuous Learning',    subCategory: null,                               badge: 'AUTO'   },
  positive_behaviour:        { name: 'Positive Behaviour & Conduct',     maxPoints: 5,  coreValue: 'Optimism',               subCategory: null,                               badge: 'MANUAL' },
  gratitude:                 { name: 'Gratitude',                        maxPoints: 5,  coreValue: 'Gratitude',              subCategory: null,                               badge: 'MANUAL' },
};

const CORE_VALUE_GROUPS = [
  {
    coreValue: 'Diligent and Committed',
    maxPoints: 75,
    headerColor: '#D9EAD3',
    headerTextColor: '#14532d',
    subCategories: ['Delivery & Execution', 'Quality & Engineering Excellence', 'Attendance'] as (string | null)[],
  },
  { coreValue: 'Collaboration',       maxPoints: 10, headerColor: '#CCCCFF', headerTextColor: '#3b0764', subCategories: [null] as (string | null)[] },
  { coreValue: 'Continuous Learning', maxPoints: 5,  headerColor: '#C9DAF8', headerTextColor: '#1e3a5f', subCategories: [null] as (string | null)[] },
  { coreValue: 'Optimism',            maxPoints: 5,  headerColor: '#F4CCCC', headerTextColor: '#7f1d1d', subCategories: [null] as (string | null)[] },
  { coreValue: 'Gratitude',           maxPoints: 5,  headerColor: '#FCE5CD', headerTextColor: '#7c2d12', subCategories: [null] as (string | null)[] },
];

function kpiGrade(total: number): { grade: string; label: string; color: string; bg: string } {
  if (total >= 90) return { grade: 'A', label: 'Excellent',          color: '#065f46', bg: '#d1fae5' };
  if (total >= 75) return { grade: 'B', label: 'Good',               color: '#1e3a5f', bg: '#dbeafe' };
  if (total >= 60) return { grade: 'C', label: 'Average',            color: '#78350f', bg: '#fef3c7' };
  return               { grade: 'D', label: 'Needs Improvement',  color: '#7f1d1d', bg: '#fee2e2' };
}

function buildKpiEmailBody(
  fullName: string,
  period: string,
  metrics: { metricId: string; points: number }[],
  totalScore: number,
): string {
  const scoreMap = new Map(metrics.map((m) => [m.metricId, m.points]));
  const { grade, label, color, bg } = kpiGrade(totalScore);

  const badgeHtml = (badge: 'AUTO' | 'MANUAL' | 'SELF') => {
    const cfg = {
      AUTO:   { bg: '#dcfce7', text: '#166534', label: 'AUTO'   },
      MANUAL: { bg: '#ede9fe', text: '#5b21b6', label: 'MANUAL' },
      SELF:   { bg: '#dbeafe', text: '#1d4ed8', label: 'SELF'   },
    }[badge];
    return `<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:${cfg.bg};color:${cfg.text};font-weight:700;letter-spacing:0.03em;">${cfg.label}</span>`;
  };

  const sections = CORE_VALUE_GROUPS.map((group) => {
    const groupMetrics = Object.entries(METRIC_INFO).filter(([ ,m]) => m.coreValue === group.coreValue);
    const groupEarned = groupMetrics.reduce((s, [id]) => s + (scoreMap.get(id) ?? 0), 0);
    const groupEarnedRounded = Math.round(groupEarned * 10) / 10;

    let rows = '';
    let lastSubCat: string | null | undefined = undefined;

    for (const subCat of group.subCategories) {
      const subMetrics = groupMetrics.filter(([, m]) => m.subCategory === subCat);
      if (subMetrics.length === 0) continue;

      if (subCat !== null && subCat !== lastSubCat) {
        rows += `<tr>
          <td colspan="3" style="padding:5px 12px 4px 16px;background:#f9fafb;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${subCat}</td>
        </tr>`;
      }
      lastSubCat = subCat;

      for (const [metricId, info] of subMetrics) {
        const pts = scoreMap.get(metricId) ?? 0;
        const ptsStr = Number.isInteger(pts) ? String(pts) : pts.toFixed(1);
        const isZero = pts === 0;
        rows += `<tr>
          <td style="padding:7px 8px 7px ${subCat ? '24px' : '16px'};border-bottom:1px solid #f3f4f6;color:#374151;">${info.name}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #f3f4f6;">${badgeHtml(info.badge)}</td>
          <td style="padding:7px 14px 7px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:${isZero ? '#9ca3af' : '#111827'};">${ptsStr}&thinsp;/&thinsp;${info.maxPoints}</td>
        </tr>`;
      }
    }

    return `<tr>
      <td colspan="3" style="padding:9px 14px;background:${group.headerColor};color:${group.headerTextColor};font-weight:700;font-size:13px;">
        ${group.coreValue}
        <span style="float:right;font-weight:600;font-size:12px;">${groupEarnedRounded}&thinsp;/&thinsp;${group.maxPoints} pts</span>
      </td>
    </tr>
    ${rows}`;
  });

  const totalRounded = Math.round(totalScore * 10) / 10;

  return `
    <p style="margin:0 0 18px;color:#374151;font-size:15px;">
      Hi <strong>${fullName}</strong>, here is your KPI summary for <strong>${period}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
      <tbody>
        ${sections.join('\n')}
      </tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;border-radius:6px;overflow:hidden;">
      <tbody>
        <tr style="background:#1e293b;">
          <td style="padding:11px 16px;color:#f1f5f9;font-weight:600;">Total Score</td>
          <td style="padding:11px 16px;color:#f1f5f9;text-align:right;font-weight:700;font-size:16px;">${totalRounded}&thinsp;/&thinsp;100</td>
        </tr>
        <tr style="background:${bg};">
          <td style="padding:10px 16px;color:${color};font-weight:600;">Grade</td>
          <td style="padding:10px 16px;color:${color};text-align:right;font-weight:700;font-size:15px;">${grade} — ${label}</td>
        </tr>
      </tbody>
    </table>`;
}

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Cron('0 9 * * *', { name: 'deadline-reminders' })
  async handleDeadlineReminders(): Promise<void> {
    this.logger.log('Running deadline reminder cron');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    const completedStatuses: BoardStatus[] = [BoardStatus.QA_DONE];

    const tasks = await this.prisma.workItem.findMany({
      where: {
        dueDate: new Date(tomorrowDate),
        status: { notIn: completedStatuses },
        assigneeId: { not: null },
        assignee: { isActive: true },
      },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        project: { select: { name: true } },
      },
    });

    if (tasks.length === 0) {
      this.logger.log('No tasks due tomorrow — skipping deadline emails');
      return;
    }

    const grouped = new Map<string, typeof tasks>();
    for (const task of tasks) {
      if (!task.assignee?.email) continue;
      const key = task.assignee.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(task);
    }

    for (const [, userTasks] of grouped) {
      const assignee = userTasks[0].assignee!;
      const rows = userTasks
        .map(
          (t) => `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${t.title}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${t.project.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${tomorrowDate}</td>
          </tr>`,
        )
        .join('');

      const body = `
        <p style="margin:0 0 16px;color:#374151;font-size:15px;">
          Hi ${assignee.fullName}, you have <strong>${userTasks.length} task${userTasks.length > 1 ? 's' : ''}</strong>
          due <strong>tomorrow</strong>. Please ensure they are completed or updated before end of day.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Task</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Project</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Due Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;

      try {
        await this.email.sendEmail(
          assignee.email,
          `Reminder: ${userTasks.length} task${userTasks.length > 1 ? 's' : ''} due tomorrow`,
          this.email.wrapHtml('Task Deadline Reminder', body),
        );
      } catch (err) {
        this.logger.error(
          `Failed to send deadline reminder to ${assignee.email}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Deadline reminders sent to ${grouped.size} assignee(s)`);
  }

  @Cron('0 9 * * *', { name: 'bug-reminders' })
  async handleBugReminders(): Promise<void> {
    this.logger.log('Running bug reminder cron');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const bugs = await this.prisma.workItem.findMany({
      where: {
        type: WorkItemType.BUG,
        reminderType: { not: BugReminderType.NONE },
        status: { not: BoardStatus.QA_DONE },
        assigneeId: { not: null },
        assignee: { isActive: true },
      },
      include: {
        assignee: { select: { fullName: true, email: true } },
        project: { select: { name: true } },
      },
    });

    let sent = 0;
    for (const bug of bugs) {
      if (!bug.assignee?.email) continue;

      const due = bug.dueDate ? new Date(bug.dueDate) : null;
      const shouldSend =
        bug.reminderType === BugReminderType.DAILY ||
        (bug.reminderType === BugReminderType.ONE_DAY   && due && isSameDay(due, addDays(today, 1))) ||
        (bug.reminderType === BugReminderType.TWO_DAYS  && due && isSameDay(due, addDays(today, 2))) ||
        (bug.reminderType === BugReminderType.THREE_DAYS && due && isSameDay(due, addDays(today, 3)));

      if (!shouldSend) continue;

      const reminderLabel =
        bug.reminderType === BugReminderType.DAILY      ? 'Daily reminder' :
        bug.reminderType === BugReminderType.ONE_DAY    ? '1 day before due date' :
        bug.reminderType === BugReminderType.TWO_DAYS   ? '2 days before due date' :
                                                          '3 days before due date';

      const dueStr = due ? due.toISOString().split('T')[0] : '—';

      const body = `
        <p style="margin:0 0 16px;color:#374151;font-size:15px;">
          Hi ${bug.assignee.fullName}, this is a <strong>${reminderLabel}</strong> for a bug assigned to you.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
          <tbody>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;width:130px;">Bug</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;">${bug.title}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Project</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${bug.project.name}</td></tr>
            <tr><td style="padding:8px 12px;color:#6b7280;">Due Date</td><td style="padding:8px 12px;color:#dc2626;font-weight:600;">${dueStr}</td></tr>
          </tbody>
        </table>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;">
          <p style="margin:0;color:#991b1b;font-size:13px;">
            Please action this bug in PMS to keep the project on track.
          </p>
        </div>`;

      try {
        await this.email.sendEmail(
          bug.assignee.email,
          `Bug Reminder: ${bug.title}`,
          this.email.wrapHtml('Bug Reminder', body),
        );
        sent++;
      } catch (err) {
        this.logger.error(`Failed to send bug reminder to ${bug.assignee.email}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`Bug reminder cron complete — ${sent} email(s) sent`);
  }

  @Cron('0 16 * * 5', { name: 'timesheet-reminders' })
  async handleTimesheetReminders(): Promise<void> {
    this.logger.log('Running timesheet reminder cron');

    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const weekLabel = `${monday.toISOString().split('T')[0]} – ${friday.toISOString().split('T')[0]}`;

    const activeUsers = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, email: true },
    });

    for (const user of activeUsers) {
      const agg = await this.prisma.timesheetEntry.aggregate({
        where: {
          userId: user.id,
          date: { gte: monday, lte: friday },
        },
        _sum: { hours: true },
      });

      const totalHours = Number(agg._sum.hours ?? 0);
      if (totalHours > 0) continue;

      const body = `
        <p style="margin:0 0 16px;color:#374151;font-size:15px;">
          Hi ${user.fullName}, our records show that you have not logged any timesheet hours
          for the week of <strong>${weekLabel}</strong>.
        </p>
        <p style="margin:0 0 16px;color:#374151;font-size:15px;">
          Please log your hours in PMS before end of day today to keep project records up to date.
        </p>
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
          <p style="margin:0;color:#92400e;font-size:13px;">
            If you have already submitted your timesheet or were on approved leave this week,
            please ignore this reminder.
          </p>
        </div>`;

      try {
        await this.email.sendEmail(
          user.email!,
          'Reminder: Please log your timesheet hours',
          this.email.wrapHtml('Timesheet Reminder', body),
        );
      } catch (err) {
        this.logger.error(
          `Failed to send timesheet reminder to ${user.email}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log('Timesheet reminder cron complete');
  }

  @Cron('0 8 * * *', { name: 'overdue-task-escalation' })
  async handleOverdueTaskEscalation(): Promise<void> {
    this.logger.log('Running overdue task escalation cron');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    const oneDayAgo = new Date(today);
    oneDayAgo.setDate(today.getDate() - 1);

    const completedStatuses: BoardStatus[] = [BoardStatus.QA_DONE, BoardStatus.QA, BoardStatus.CLOSED];

    const overdueTasks = await this.prisma.workItem.findMany({
      where: {
        dueDate: { gte: twoDaysAgo, lt: oneDayAgo },
        status: { notIn: completedStatuses },
        type: { in: [WorkItemType.TASK, WorkItemType.USER_STORY, WorkItemType.BUG] },
        assigneeId: { not: null },
        assignee: { isActive: true },
        project: { status: ProjectStatus.ACTIVE },
      },
      include: {
        assignee: { select: { fullName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (overdueTasks.length === 0) {
      this.logger.log('No overdue tasks — skipping escalation emails');
      return;
    }

    const byProject = new Map<string, typeof overdueTasks>();
    for (const task of overdueTasks) {
      if (!byProject.has(task.project.id)) byProject.set(task.project.id, []);
      byProject.get(task.project.id)!.push(task);
    }

    for (const [projectId, tasks] of byProject) {
      const pmMember = await this.prisma.projectMember.findFirst({
        where: { projectId, projectRole: ProjectRole.PROJECT_MANAGER },
        include: { user: { select: { fullName: true, email: true, isActive: true } } },
      });

      if (!pmMember?.user?.email || !pmMember.user.isActive) continue;

      const projectName = tasks[0].project.name;
      const rows = tasks
        .map((t) => {
          const daysOverdue = Math.floor(
            (today.getTime() - new Date(t.dueDate!).getTime()) / (1000 * 60 * 60 * 24),
          );
          return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${t.title}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${t.assignee?.fullName ?? '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${t.dueDate!.toISOString().split('T')[0]}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#dc2626;font-weight:700;">${daysOverdue}d</td>
          </tr>`;
        })
        .join('');

      const body = `
        <p style="margin:0 0 16px;color:#374151;font-size:15px;">
          Hi ${pmMember.user.fullName}, the following
          <strong>${tasks.length} task${tasks.length > 1 ? 's' : ''}</strong> in
          <strong>${projectName}</strong> ${tasks.length > 1 ? 'are' : 'is'} overdue by 2 or more days
          and require your attention.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#fef2f2;">
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #fecaca;">Task</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #fecaca;">Assignee</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #fecaca;">Due Date</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #fecaca;">Days Overdue</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;">
          <p style="margin:0;color:#991b1b;font-size:13px;">
            Please review these tasks and take appropriate action — reassign, reschedule, or close as needed.
          </p>
        </div>`;

      try {
        await this.email.sendEmail(
          pmMember.user.email,
          `Action Required: ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''} in ${projectName}`,
          this.email.wrapHtml('Overdue Task Escalation', body),
        );
      } catch (err) {
        this.logger.error(
          `Failed to send escalation email to ${pmMember.user.email}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Overdue escalation emails sent for ${byProject.size} project(s)`);
  }

  @Cron('0 8 * * 1', { name: 'weekly-project-health' })
  async handleWeeklyProjectHealthReport(): Promise<void> {
    this.logger.log('Running weekly project health report cron');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedStatuses: BoardStatus[] = [BoardStatus.QA_DONE, BoardStatus.QA];

    const activeProjects = await this.prisma.project.findMany({
      where: { status: ProjectStatus.ACTIVE },
      select: { id: true, name: true },
    });

    for (const project of activeProjects) {
      const pmMember = await this.prisma.projectMember.findFirst({
        where: { projectId: project.id, projectRole: ProjectRole.PROJECT_MANAGER },
        include: { user: { select: { fullName: true, email: true, isActive: true } } },
      });

      if (!pmMember?.user?.email || !pmMember.user.isActive) continue;

      const [totalCount, completedCount, overdueCount, openBugCount, milestones, teamSize] =
        await Promise.all([
          this.prisma.workItem.count({ where: { projectId: project.id } }),
          this.prisma.workItem.count({
            where: { projectId: project.id, status: { in: completedStatuses } },
          }),
          this.prisma.workItem.count({
            where: {
              projectId: project.id,
              dueDate: { lt: today },
              status: { notIn: completedStatuses },
            },
          }),
          this.prisma.workItem.count({
            where: {
              projectId: project.id,
              type: WorkItemType.BUG,
              status: { notIn: completedStatuses },
            },
          }),
          this.prisma.milestone.findMany({
            where: { projectId: project.id },
            select: { name: true, status: true, dueDate: true },
          }),
          this.prisma.projectMember.count({ where: { projectId: project.id } }),
        ]);

      const pendingCount = totalCount - completedCount;

      const statusBadge = (s: MilestoneStatus) => {
        const map: Record<MilestoneStatus, string> = {
          NOT_STARTED: '#6b7280',
          IN_PROGRESS: '#2563eb',
          COMPLETED: '#16a34a',
          DELAYED: '#dc2626',
        };
        return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${map[s]}22;color:${map[s]};font-size:12px;font-weight:700;">${s.replace('_', ' ')}</span>`;
      };

      const milestoneRows =
        milestones.length > 0
          ? milestones
              .map(
                (m) => `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${m.name ?? '—'}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${m.dueDate ? m.dueDate.toISOString().split('T')[0] : '—'}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${statusBadge(m.status)}</td>
            </tr>`,
              )
              .join('')
          : '<tr><td colspan="3" style="padding:8px 12px;color:#9ca3af;font-style:italic;">No milestones defined</td></tr>';

      const body = `
        <p style="margin:0 0 16px;color:#374151;font-size:15px;">
          Hi ${pmMember.user.fullName}, here is your weekly health summary for
          <strong>${project.name}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
          <thead>
            <tr style="background:#f0fdf4;">
              <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #bbf7d0;">Metric</th>
              <th style="padding:10px 14px;text-align:center;border-bottom:2px solid #bbf7d0;">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;">Total Tasks</td><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:700;">${totalCount}</td></tr>
            <tr><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;">Completed</td><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#16a34a;font-weight:700;">${completedCount}</td></tr>
            <tr><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;">Pending</td><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#2563eb;font-weight:700;">${pendingCount}</td></tr>
            <tr><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;">Overdue</td><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#dc2626;font-weight:700;">${overdueCount}</td></tr>
            <tr><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;">Open Bugs</td><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#f59e0b;font-weight:700;">${openBugCount}</td></tr>
            <tr><td style="padding:8px 14px;">Team Size</td><td style="padding:8px 14px;text-align:center;font-weight:700;">${teamSize}</td></tr>
          </tbody>
        </table>
        <h3 style="margin:0 0 12px;font-size:15px;color:#111827;">Milestones</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Milestone</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Due Date</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Status</th>
            </tr>
          </thead>
          <tbody>${milestoneRows}</tbody>
        </table>`;

      try {
        await this.email.sendEmail(
          pmMember.user.email,
          `Weekly Project Health Report — ${project.name}`,
          this.email.wrapHtml('Weekly Project Health Report', body),
        );
      } catch (err) {
        this.logger.error(
          `Failed to send health report to ${pmMember.user.email}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log('Weekly project health report cron complete');
  }

  @Cron('0 8 1 * *', { name: 'monthly-kpi-digest' })
  async handleMonthlyKpiDigest(overridePeriod?: string, filterUserIds?: string[]): Promise<{ sent: number; period: string }> {
    this.logger.log('Running monthly KPI digest cron');

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const period = overridePeriod ?? `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    // Compute all 14 metrics for every active non-admin user and persist the 10 auto-computed ones
    const allResults = await this.analytics.computeAndSaveAutoMetrics(period);
    const userResults = filterUserIds?.length
      ? allResults.filter((r) => filterUserIds.includes(r.userId))
      : allResults;

    let sent = 0;
    for (const result of userResults) {
      if (!result.email) continue;

      const periodLabel = new Date(prevMonth).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
      const body = buildKpiEmailBody(result.fullName, periodLabel, result.metrics, result.totalScore);

      try {
        await this.email.sendEmail(
          result.email,
          `Your Monthly Performance Scorecard — ${periodLabel}`,
          this.email.wrapHtml('Monthly Performance Scorecard', body),
        );
        sent++;
      } catch (err) {
        this.logger.error(
          `Failed to send KPI digest to ${result.email}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Monthly KPI digest cron complete for period ${period} — ${sent} email(s) sent`);
    return { sent, period };
  }

  @Cron('5 8 1 * *', { name: 'monthly-leave-report' })
  async handleMonthlyLeaveReport(): Promise<void> {
    this.logger.log('Running monthly leave report cron');

    const now = new Date();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const periodLabel = prevMonthStart.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

    const leaveGroups = await this.prisma.leaveRequest.groupBy({
      by: ['userId'],
      where: {
        status: LeaveStatus.APPROVED,
        startDate: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { totalDays: true },
    });

    const admins = await this.prisma.user.findMany({
      where: {
        isActive: true,
        systemRole: { in: [SystemRole.SUPER_USER, SystemRole.ADMIN] },
      },
      select: { fullName: true, email: true },
    });

    if (admins.length === 0) {
      this.logger.log('No admins found — skipping leave report');
      return;
    }

    const userIds = leaveGroups.map((g) => g.userId);
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true },
        })
      : [];

    const nameMap = new Map(users.map((u) => [u.id, u.fullName]));

    const rows =
      leaveGroups.length > 0
        ? leaveGroups
            .map(
              (g) => `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${nameMap.get(g.userId) ?? g.userId}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:700;">${g._sum.totalDays ?? 0}</td>
            </tr>`,
            )
            .join('')
        : '<tr><td colspan="2" style="padding:8px 12px;color:#9ca3af;font-style:italic;">No approved leave taken in this period.</td></tr>';

    const body = `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;">
        Here is the team leave usage summary for <strong>${periodLabel}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Employee</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Days Taken</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    for (const admin of admins) {
      try {
        await this.email.sendEmail(
          admin.email!,
          `Monthly Leave Report — ${periodLabel}`,
          this.email.wrapHtml('Monthly Leave Usage Report', body),
        );
      } catch (err) {
        this.logger.error(
          `Failed to send leave report to ${admin.email}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log('Monthly leave report cron complete');
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BoardStatus, LeaveStatus, MilestoneStatus, ProjectRole, ProjectStatus, SystemRole, WorkItemType } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
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

    const completedStatuses: BoardStatus[] = [BoardStatus.QA_DONE, BoardStatus.QA];

    const overdueTasks = await this.prisma.workItem.findMany({
      where: {
        dueDate: { lt: today, lte: twoDaysAgo },
        status: { notIn: completedStatuses },
        type: { in: [WorkItemType.TASK, WorkItemType.USER_STORY, WorkItemType.BUG] },
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
  async handleMonthlyKpiDigest(): Promise<void> {
    this.logger.log('Running monthly KPI digest cron');

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const period = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    const activeUsers = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, email: true },
    });

    for (const user of activeUsers) {
      const records = await this.prisma.kpiRecord.findMany({
        where: { userId: user.id, period },
        select: { metricId: true, points: true },
      });

      if (records.length === 0) continue;

      const rows = records
        .map(
          (r) => `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${r.metricId}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;">${r.points}</td>
          </tr>`,
        )
        .join('');

      const body = `
        <p style="margin:0 0 16px;color:#374151;font-size:15px;">
          Hi ${user.fullName}, here is your KPI summary for <strong>${period}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Metric</th>
              <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Points</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;

      try {
        await this.email.sendEmail(
          user.email,
          `Your KPI Digest for ${period}`,
          this.email.wrapHtml('Monthly KPI Digest', body),
        );
      } catch (err) {
        this.logger.error(
          `Failed to send KPI digest to ${user.email}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Monthly KPI digest cron complete for period ${period}`);
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

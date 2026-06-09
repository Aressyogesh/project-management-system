import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BoardStatus } from '@prisma/client';
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
}

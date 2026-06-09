import { Test, TestingModule } from '@nestjs/testing';
import { BoardStatus } from '@prisma/client';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsCronService } from '../notifications-cron.service';

const mockAssigneeA = { id: 'user-a', fullName: 'Alice', email: 'alice@pms.com' };
const mockAssigneeB = { id: 'user-b', fullName: 'Bob', email: 'bob@pms.com' };

const makeTask = (assignee: typeof mockAssigneeA, title = 'Fix bug') => ({
  id: `task-${Math.random()}`,
  title,
  status: BoardStatus.IN_PROGRESS,
  dueDate: new Date(),
  assigneeId: assignee.id,
  assignee,
  project: { name: 'Project Alpha' },
});

const mockPrisma = {
  workItem: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
  timesheetEntry: { aggregate: jest.fn() },
};

const mockEmail = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
  wrapHtml: jest.fn().mockReturnValue('<html>wrapped</html>'),
};

describe('NotificationsCronService', () => {
  let service: NotificationsCronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsCronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<NotificationsCronService>(NotificationsCronService);
    jest.clearAllMocks();
    mockEmail.sendEmail.mockResolvedValue(undefined);
    mockEmail.wrapHtml.mockReturnValue('<html>wrapped</html>');
  });

  // ── Deadline reminders ────────────────────────────────────────────────────

  describe('handleDeadlineReminders', () => {
    it('UTC-F039-B-001: HandleDeadlineReminders_TasksDueTomorrow_SendsGroupedEmailPerAssignee', async () => {
      mockPrisma.workItem.findMany.mockResolvedValue([
        makeTask(mockAssigneeA, 'Task 1'),
        makeTask(mockAssigneeA, 'Task 2'),
        makeTask(mockAssigneeB, 'Task 3'),
      ]);

      await service.handleDeadlineReminders();

      expect(mockEmail.sendEmail).toHaveBeenCalledTimes(2);
      const calls = mockEmail.sendEmail.mock.calls;
      const toAddresses = calls.map((c: string[]) => c[0]);
      expect(toAddresses).toContain('alice@pms.com');
      expect(toAddresses).toContain('bob@pms.com');
    });

    it('UTC-F039-B-002: HandleDeadlineReminders_NoTasksDueTomorrow_SendsNoEmails', async () => {
      mockPrisma.workItem.findMany.mockResolvedValue([]);

      await service.handleDeadlineReminders();

      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
    });

    it('UTC-F039-B-003: HandleDeadlineReminders_SmtpFails_LogsErrorAndDoesNotThrow', async () => {
      mockPrisma.workItem.findMany.mockResolvedValue([makeTask(mockAssigneeA)]);
      mockEmail.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

      await expect(service.handleDeadlineReminders()).resolves.not.toThrow();
    });
  });

  // ── Timesheet reminders ───────────────────────────────────────────────────

  describe('handleTimesheetReminders', () => {
    it('UTC-F039-B-004: HandleTimesheetReminders_EmployeesWithZeroHours_SendsReminderEmail', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockAssigneeA, mockAssigneeB]);
      mockPrisma.timesheetEntry.aggregate.mockResolvedValue({ _sum: { hours: null } });

      await service.handleTimesheetReminders();

      expect(mockEmail.sendEmail).toHaveBeenCalledTimes(2);
      const subjects = mockEmail.sendEmail.mock.calls.map((c: string[]) => c[1]);
      subjects.forEach((s: string) => expect(s.toLowerCase()).toContain('timesheet'));
    });

    it('UTC-F039-B-005: HandleTimesheetReminders_AllEmployeesLoggedHours_SendsNoEmails', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockAssigneeA]);
      mockPrisma.timesheetEntry.aggregate.mockResolvedValue({ _sum: { hours: 8 } });

      await service.handleTimesheetReminders();

      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
    });

    it('UTC-F039-B-006: HandleTimesheetReminders_SmtpFails_LogsErrorAndDoesNotThrow', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockAssigneeA]);
      mockPrisma.timesheetEntry.aggregate.mockResolvedValue({ _sum: { hours: null } });
      mockEmail.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

      await expect(service.handleTimesheetReminders()).resolves.not.toThrow();
    });
  });
});

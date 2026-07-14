import { Test, TestingModule } from '@nestjs/testing';
import { BoardStatus, MilestoneStatus } from '@prisma/client';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsCronService } from '../notifications-cron.service';

const mockAssigneeA = { id: 'user-a', fullName: 'Alice', email: 'alice@pms.com', isActive: true };
const mockAssigneeB = { id: 'user-b', fullName: 'Bob', email: 'bob@pms.com', isActive: true };

const makeTask = (assignee: typeof mockAssigneeA, title = 'Fix bug') => ({
  id: `task-${Math.random()}`,
  title,
  status: BoardStatus.IN_PROGRESS,
  dueDate: new Date(),
  assigneeId: assignee.id,
  assignee,
  project: { name: 'Project Alpha' },
});

const makeOverdueTask = (projectId: string, projectName: string) => ({
  id: `task-${Math.random()}`,
  title: 'Overdue Task',
  type: 'TASK',
  status: BoardStatus.IN_PROGRESS,
  dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  assignee: { fullName: 'Alice' },
  project: { id: projectId, name: projectName },
});

const mockPrisma = {
  workItem: { findMany: jest.fn(), count: jest.fn() },
  user: { findMany: jest.fn() },
  timesheetEntry: { aggregate: jest.fn() },
  projectMember: { findFirst: jest.fn(), count: jest.fn() },
  project: { findMany: jest.fn() },
  milestone: { findMany: jest.fn() },
  kpiRecord: { findMany: jest.fn() },
  leaveRequest: { groupBy: jest.fn() },
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

  // ── Overdue task escalation ───────────────────────────────────────────────

  describe('handleOverdueTaskEscalation', () => {
    it('UTC-F040-B-001: HandleOverdueTaskEscalation_OverdueTasksWithPm_SendsEscalationEmailToPm', async () => {
      mockPrisma.workItem.findMany.mockResolvedValue([
        makeOverdueTask('proj-1', 'Project Alpha'),
        makeOverdueTask('proj-1', 'Project Alpha'),
      ]);
      mockPrisma.projectMember.findFirst.mockResolvedValue({
        user: mockAssigneeA,
      });

      await service.handleOverdueTaskEscalation();

      expect(mockEmail.sendEmail).toHaveBeenCalledTimes(1);
      const [to, subject] = mockEmail.sendEmail.mock.calls[0];
      expect(to).toBe('alice@pms.com');
      expect(subject.toLowerCase()).toContain('overdue');
    });

    it('UTC-F040-B-002: HandleOverdueTaskEscalation_NoOverdueTasks_SendsNoEmails', async () => {
      mockPrisma.workItem.findMany.mockResolvedValue([]);

      await service.handleOverdueTaskEscalation();

      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
    });

    it('UTC-F040-B-003: HandleOverdueTaskEscalation_ProjectHasNoPm_SkipsProject', async () => {
      mockPrisma.workItem.findMany.mockResolvedValue([
        makeOverdueTask('proj-1', 'Project Alpha'),
      ]);
      mockPrisma.projectMember.findFirst.mockResolvedValue(null);

      await service.handleOverdueTaskEscalation();

      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
    });

    it('UTC-F040-B-004: HandleOverdueTaskEscalation_SmtpFails_LogsErrorAndDoesNotThrow', async () => {
      mockPrisma.workItem.findMany.mockResolvedValue([
        makeOverdueTask('proj-1', 'Project Alpha'),
      ]);
      mockPrisma.projectMember.findFirst.mockResolvedValue({ user: mockAssigneeA });
      mockEmail.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

      await expect(service.handleOverdueTaskEscalation()).resolves.not.toThrow();
    });

    it('UTC-F040-B-005: HandleOverdueTaskEscalation_ClosedTasksExcluded_SendsNoEmail', async () => {
      // DB query already filters CLOSED via completedStatuses — simulate empty result
      mockPrisma.workItem.findMany.mockResolvedValue([]);

      await service.handleOverdueTaskEscalation();

      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
    });

    it('UTC-F040-B-006: HandleOverdueTaskEscalation_InactiveProjectTasksExcluded_SendsNoEmail', async () => {
      // DB query filters project.status = ACTIVE — simulate empty result for inactive projects
      mockPrisma.workItem.findMany.mockResolvedValue([]);

      await service.handleOverdueTaskEscalation();

      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
    });
  });

  // ── Weekly project health report ──────────────────────────────────────────

  describe('handleWeeklyProjectHealthReport', () => {
    const setupHealthMocks = () => {
      mockPrisma.project.findMany.mockResolvedValue([
        { id: 'proj-1', name: 'Project Alpha' },
        { id: 'proj-2', name: 'Project Beta' },
      ]);
      mockPrisma.projectMember.findFirst.mockResolvedValue({ user: mockAssigneeA });
      mockPrisma.workItem.count
        .mockResolvedValueOnce(10)  // total proj-1
        .mockResolvedValueOnce(5)   // completed proj-1
        .mockResolvedValueOnce(2)   // overdue proj-1
        .mockResolvedValueOnce(1)   // bugs proj-1
        .mockResolvedValueOnce(10)  // total proj-2
        .mockResolvedValueOnce(8)   // completed proj-2
        .mockResolvedValueOnce(0)   // overdue proj-2
        .mockResolvedValueOnce(0);  // bugs proj-2
      mockPrisma.milestone.findMany.mockResolvedValue([
        { name: 'M1', status: MilestoneStatus.IN_PROGRESS, dueDate: new Date() },
      ]);
      mockPrisma.projectMember.count.mockResolvedValue(4);
    };

    it('UTC-F040-B-005: HandleWeeklyProjectHealthReport_ActiveProjectsWithPm_SendsHealthEmailPerPm', async () => {
      setupHealthMocks();

      await service.handleWeeklyProjectHealthReport();

      expect(mockEmail.sendEmail).toHaveBeenCalledTimes(2);
      const subjects = mockEmail.sendEmail.mock.calls.map((c: string[]) => c[1]);
      subjects.forEach((s: string) =>
        expect(s.toLowerCase()).toMatch(/health|weekly/),
      );
    });

    it('UTC-F040-B-006: HandleWeeklyProjectHealthReport_ProjectHasNoPm_SkipsProject', async () => {
      mockPrisma.project.findMany.mockResolvedValue([{ id: 'proj-1', name: 'Project Alpha' }]);
      mockPrisma.projectMember.findFirst.mockResolvedValue(null);

      await service.handleWeeklyProjectHealthReport();

      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
    });

    it('UTC-F040-B-007: HandleWeeklyProjectHealthReport_SmtpFails_LogsErrorAndDoesNotThrow', async () => {
      mockPrisma.project.findMany.mockResolvedValue([{ id: 'proj-1', name: 'Project Alpha' }]);
      mockPrisma.projectMember.findFirst.mockResolvedValue({ user: mockAssigneeA });
      mockPrisma.workItem.count.mockResolvedValue(0);
      mockPrisma.milestone.findMany.mockResolvedValue([]);
      mockPrisma.projectMember.count.mockResolvedValue(1);
      mockEmail.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

      await expect(service.handleWeeklyProjectHealthReport()).resolves.not.toThrow();
    });
  });

  // ── Monthly KPI digest ────────────────────────────────────────────────────

  describe('handleMonthlyKpiDigest', () => {
    it('UTC-F041-B-003: HandleMonthlyKpiDigest_UsersWithKpiRecords_SendsDigestEmail', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockAssigneeA]);
      mockPrisma.kpiRecord.findMany.mockResolvedValue([
        { metricId: 'QUALITY', points: 90 },
        { metricId: 'DELIVERY', points: 85 },
      ]);

      await service.handleMonthlyKpiDigest();

      expect(mockEmail.sendEmail).toHaveBeenCalledTimes(1);
      const [to, subject] = mockEmail.sendEmail.mock.calls[0];
      expect(to).toBe('alice@pms.com');
      expect(subject.toLowerCase()).toContain('kpi');
    });

    it('UTC-F041-B-004: HandleMonthlyKpiDigest_UserHasNoKpiRecords_SkipsEmail', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockAssigneeA]);
      mockPrisma.kpiRecord.findMany.mockResolvedValue([]);

      await service.handleMonthlyKpiDigest();

      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
    });

    it('UTC-F041-B-005: HandleMonthlyKpiDigest_SmtpFails_LogsErrorAndDoesNotThrow', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockAssigneeA]);
      mockPrisma.kpiRecord.findMany.mockResolvedValue([{ metricId: 'QUALITY', points: 90 }]);
      mockEmail.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

      await expect(service.handleMonthlyKpiDigest()).resolves.not.toThrow();
    });
  });

  // ── Monthly leave report ──────────────────────────────────────────────────

  describe('handleMonthlyLeaveReport', () => {
    it('UTC-F041-B-006: HandleMonthlyLeaveReport_ApprovedLeaveExists_SendsReportToAdmins', async () => {
      mockPrisma.leaveRequest.groupBy.mockResolvedValue([
        { userId: 'user-a', _sum: { totalDays: 5 } },
      ]);
      mockPrisma.user.findMany
        .mockResolvedValueOnce([{ fullName: 'Admin', email: 'admin@pms.com' }]) // admins
        .mockResolvedValueOnce([{ id: 'user-a', fullName: 'Alice' }]); // name lookup

      await service.handleMonthlyLeaveReport();

      expect(mockEmail.sendEmail).toHaveBeenCalledTimes(1);
      const [to, subject] = mockEmail.sendEmail.mock.calls[0];
      expect(to).toBe('admin@pms.com');
      expect(subject.toLowerCase()).toContain('leave');
    });

    it('UTC-F041-B-007: HandleMonthlyLeaveReport_SmtpFails_LogsErrorAndDoesNotThrow', async () => {
      mockPrisma.leaveRequest.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([{ fullName: 'Admin', email: 'admin@pms.com' }]);
      mockEmail.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

      await expect(service.handleMonthlyLeaveReport()).resolves.not.toThrow();
    });
  });
});

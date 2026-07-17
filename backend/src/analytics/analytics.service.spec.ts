import { Test } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardStatus, WorkItemType } from '@prisma/client';

let _wiId = 0;
const wi = (
  status: BoardStatus,
  extras: Partial<{
    storyPoints: number | null;
    estimatedHours: number | null;
    completedAt: Date | null;
    inReviewAt: Date | null;
    dueDate: Date | null;
    reopenCount: number;
    qaReopenCount: number;
    type: WorkItemType;
    bugClassification: string | null;
  }> = {},
) => ({
  id: `wi-${++_wiId}`,
  status,
  storyPoints: null,
  estimatedHours: null,
  completedAt: null,
  inReviewAt: null,
  dueDate: null,
  reopenCount: 0,
  qaReopenCount: 0,
  type: WorkItemType.TASK,
  bugClassification: null,
  ...extras,
});

describe('AnalyticsService — KPI computation', () => {
  let service: AnalyticsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    fullName: 'Test User',
    systemRole: 'EMPLOYEE',
    department: { name: 'Digital' },
    projectMembers: [],
  };

  beforeEach(async () => {
    _wiId = 0;
    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            user: { findMany: jest.fn() },
            project: { findMany: jest.fn() },
            workItem: { findMany: jest.fn(), count: jest.fn() },
            timesheetEntry: { aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
            kpiRecord: { findMany: jest.fn() },
            leaveRequest: { findMany: jest.fn() },
            lateComingLog: { findMany: jest.fn() },
            upskillAssignment: { findFirst: jest.fn() },
            portalConfig: { findUnique: jest.fn() },
            holiday: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get(AnalyticsService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  function setupUserKpiMocks({
    allItems = [],
    bugItems = [],
    manualScores = [],
    leaveRequests = [],
    lateComingLogs = [],
    upskillApproved = null as { id: string } | null,
    upskillRejected = null as { id: string } | null,
    totalHours = 40,
    deliveryHours = 0,
  }: {
    allItems?: ReturnType<typeof wi>[];
    bugItems?: { id: string; bugClassification: string | null }[];
    manualScores?: { metricId: string; points: number }[];
    leaveRequests?: { isPlanned: boolean; startDate: Date; endDate: Date; isHalfDay: boolean }[];
    lateComingLogs?: { minutesLate: number }[];
    upskillApproved?: { id: string } | null;
    upskillRejected?: { id: string } | null;
    totalHours?: number;
    deliveryHours?: number;
  }) {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
    (prisma.project.findMany as jest.Mock).mockResolvedValue([{ id: 'active-project-1' }]);

    // Phase 1: workItem.findMany called twice — allAssignedItems first, then bugItems
    (prisma.workItem.findMany as jest.Mock)
      .mockResolvedValueOnce(allItems)
      .mockResolvedValueOnce(bugItems);

    (prisma.kpiRecord.findMany as jest.Mock).mockResolvedValue(manualScores);
    (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(leaveRequests);
    (prisma.lateComingLog.findMany as jest.Mock).mockResolvedValue(lateComingLogs);

    // Phase 1: upskillAssignment.findFirst called twice — APPROVED LEARNING first, then REJECTED LEARNING
    (prisma.upskillAssignment.findFirst as jest.Mock)
      .mockResolvedValueOnce(upskillApproved)
      .mockResolvedValueOnce(upskillRejected);

    // Phase 1: total working hours aggregate (call 1)
    // Phase 2: timesheet hours on assigned items (call 2), then conditional bug/rework aggregates
    (prisma.timesheetEntry.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { hours: totalHours } })
      .mockResolvedValue({ _sum: { hours: deliveryHours } });
  }

  // ── Sprint Reliability ────────────────────────────────────────────────────────

  it('Sprint Reliability: 100% in-QA returns 10', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.IN_QA), wi(BoardStatus.IN_QA)],
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'sprint_reliability')!;
    expect(metric.points).toBe(10);
  });

  it('Sprint Reliability: 50% in-QA returns 5', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.IN_QA), wi(BoardStatus.TODO)],
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'sprint_reliability')!;
    expect(metric.points).toBe(5);
  });

  it('Sprint Reliability: no work items returns 0', async () => {
    setupUserKpiMocks({ allItems: [wi(BoardStatus.TODO)], manualScores: [{ metricId: 'timeliness', points: 5 }] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'sprint_reliability')!;
    expect(metric.points).toBe(0);
  });

  // ── Delivery Timeliness ───────────────────────────────────────────────────────

  it('Delivery Timeliness: all moved to In-Review on time returns 10', async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 86_400_000);
    setupUserKpiMocks({
      allItems: [
        wi(BoardStatus.QA_DONE, { inReviewAt: now, dueDate: future }),
        wi(BoardStatus.QA_DONE, { inReviewAt: now, dueDate: future }),
      ],
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'delivery_timeliness')!;
    expect(metric.points).toBe(10);
  });

  // ── Estimation Accuracy ───────────────────────────────────────────────────────

  it('Estimation Accuracy: ≤15% variance returns 10', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.QA_DONE, { estimatedHours: 10 })],
      deliveryHours: 10.5,
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'estimation_accuracy')!;
    expect(metric.points).toBe(10);
  });

  it('Estimation Accuracy: >50% variance returns 0', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.QA_DONE, { estimatedHours: 10 })],
      deliveryHours: 16,
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'estimation_accuracy')!;
    expect(metric.points).toBe(0);
  });

  // ── Rework Ratio ─────────────────────────────────────────────────────────────

  it('Rework Ratio: zero IN_QA reopens returns 5', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.QA_DONE, { qaReopenCount: 0 })],
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'internal_rework_ratio')!;
    expect(metric.points).toBe(5);
  });

  // ── Defect Leakage ────────────────────────────────────────────────────────────

  it('Technical Defect Leakage: zero code-review bugs returns 10', async () => {
    setupUserKpiMocks({ allItems: [wi(BoardStatus.QA_DONE)], bugItems: [] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'technical_defect_leakage')!;
    expect(metric.points).toBe(10);
  });

  it('Functional Defect Leakage: zero functional bugs returns 10', async () => {
    setupUserKpiMocks({ allItems: [wi(BoardStatus.QA_DONE)], bugItems: [] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'functional_defect_leakage')!;
    expect(metric.points).toBe(10);
  });

  // ── Attendance ────────────────────────────────────────────────────────────────

  it('Attendance: unplanned approved leave returns 0', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.QA_DONE)],
      leaveRequests: [{ isPlanned: false, startDate: new Date('2026-05-10'), endDate: new Date('2026-05-10'), isHalfDay: false }],
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'attendance')!;
    expect(metric.points).toBe(0);
  });

  it('Attendance: 0 leave days returns 5', async () => {
    setupUserKpiMocks({ allItems: [wi(BoardStatus.QA_DONE)], leaveRequests: [] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'attendance')!;
    expect(metric.points).toBe(5);
  });

  // ── Learning Velocity ─────────────────────────────────────────────────────────

  it('Learning Velocity: approved assignment returns 5', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.TODO)],
      upskillApproved: { id: 'asgn-1' },
      upskillRejected: null,
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'learning_velocity')!;
    expect(metric.points).toBe(5);
  });

  it('Learning Velocity: rejected assignment returns 3', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.TODO)],
      upskillApproved: null,
      upskillRejected: { id: 'asgn-1' },
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'learning_velocity')!;
    expect(metric.points).toBe(3);
  });

  it('Learning Velocity: no assignment returns 0', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.TODO)],
      upskillApproved: null,
      upskillRejected: null,
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'learning_velocity')!;
    expect(metric.points).toBe(0);
  });

  // ── Total score ───────────────────────────────────────────────────────────────

  it('totalScore is sum of all metric points', async () => {
    setupUserKpiMocks({ allItems: [wi(BoardStatus.TODO)] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const expectedTotal = result.metrics.reduce((s, m) => s + m.points, 0);
    expect(result.totalScore).toBeCloseTo(expectedTotal, 1);
  });
});

import { Test } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardStatus, WorkItemType } from '@prisma/client';

// Helper to create a mock work item
const wi = (
  status: BoardStatus,
  extras: Partial<{
    storyPoints: number | null;
    estimatedHours: number | null;
    completedAt: Date | null;
    dueDate: Date | null;
    reopenCount: number;
    type: WorkItemType;
    severity: string | null;
  }> = {},
) => ({
  status,
  storyPoints: null,
  estimatedHours: null,
  completedAt: null,
  dueDate: null,
  reopenCount: 0,
  type: WorkItemType.TASK,
  severity: null,
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
    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            user: { findMany: jest.fn() },
            workItem: { findMany: jest.fn(), count: jest.fn() },
            timesheetEntry: { aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
            kpiRecord: { findMany: jest.fn() },
            leaveLog: { findMany: jest.fn() },
            learningLog: { findMany: jest.fn() },
            innovationLog: { findMany: jest.fn() },
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
    sprintItems = [],
    allItems = [],
    timesheetHours = 0,
    bugItems = [],
    manualScores = [],
    leaveLogs = [],
    learningLogs = [],
    innovationLogs = [],
  }: {
    sprintItems?: ReturnType<typeof wi>[];
    allItems?: ReturnType<typeof wi>[];
    timesheetHours?: number;
    bugItems?: { severity: string | null }[];
    manualScores?: { metricId: string; points: number }[];
    leaveLogs?: { type: string }[];
    learningLogs?: { hours: number }[];
    innovationLogs?: { type: string }[];
  }) {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
    (prisma.workItem.findMany as jest.Mock)
      .mockResolvedValueOnce(sprintItems)
      .mockResolvedValueOnce(allItems)
      .mockResolvedValueOnce(bugItems);
    (prisma.timesheetEntry.aggregate as jest.Mock).mockResolvedValue({
      _sum: { hours: timesheetHours },
    });
    (prisma.kpiRecord.findMany as jest.Mock).mockResolvedValue(manualScores);
    (prisma.leaveLog.findMany as jest.Mock).mockResolvedValue(leaveLogs);
    (prisma.learningLog.findMany as jest.Mock).mockResolvedValue(learningLogs);
    (prisma.innovationLog.findMany as jest.Mock).mockResolvedValue(innovationLogs);
  }

  it('Sprint Reliability: 100% delivery returns 15', async () => {
    setupUserKpiMocks({
      sprintItems: [
        wi(BoardStatus.QA_DONE, { storyPoints: 5 }),
        wi(BoardStatus.QA_DONE, { storyPoints: 5 }),
      ],
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'sprint_reliability')!;
    expect(metric.points).toBe(15);
  });

  it('Sprint Reliability: 50% delivery returns 7.5', async () => {
    setupUserKpiMocks({
      sprintItems: [
        wi(BoardStatus.QA_DONE, { storyPoints: 5 }),
        wi(BoardStatus.TODO,    { storyPoints: 5 }),
      ],
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'sprint_reliability')!;
    expect(metric.points).toBe(7.5);
  });

  it('Sprint Reliability: no sprint data returns 0', async () => {
    setupUserKpiMocks({ sprintItems: [] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'sprint_reliability')!;
    expect(metric.points).toBe(0);
  });

  it('Delivery Timeliness: all on time returns 15', async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 86_400_000);
    setupUserKpiMocks({
      allItems: [
        wi(BoardStatus.QA_DONE, { completedAt: now, dueDate: future }),
        wi(BoardStatus.QA_DONE, { completedAt: now, dueDate: future }),
      ],
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'delivery_timeliness')!;
    expect(metric.points).toBe(15);
  });

  it('Estimation Accuracy: ≤15% variance returns 10', async () => {
    setupUserKpiMocks({
      sprintItems: [wi(BoardStatus.QA_DONE, { estimatedHours: 10 })],
      timesheetHours: 10.5,
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'estimation_accuracy')!;
    expect(metric.points).toBe(10);
  });

  it('Estimation Accuracy: >50% variance returns 0', async () => {
    setupUserKpiMocks({
      sprintItems: [wi(BoardStatus.QA_DONE, { estimatedHours: 10 })],
      timesheetHours: 16,
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'estimation_accuracy')!;
    expect(metric.points).toBe(0);
  });

  it('Rework Ratio: zero reopens returns 5', async () => {
    setupUserKpiMocks({
      allItems: [wi(BoardStatus.QA_DONE, { reopenCount: 0 })],
    });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'internal_rework_ratio')!;
    expect(metric.points).toBe(5);
  });

  it('Defect Leakage: zero bugs returns 10', async () => {
    setupUserKpiMocks({ bugItems: [] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'defect_leakage')!;
    expect(metric.points).toBe(10);
  });

  it('Defect Leakage: 1 CRITICAL bug returns 0', async () => {
    setupUserKpiMocks({ bugItems: [{ severity: 'CRITICAL' }] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'defect_leakage')!;
    expect(metric.points).toBe(0);
  });

  it('Attendance: unapproved leave returns 0', async () => {
    setupUserKpiMocks({ leaveLogs: [{ type: 'UNAPPROVED' }] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'attendance')!;
    expect(metric.points).toBe(0);
  });

  it('Attendance: 0 leave days returns 5', async () => {
    setupUserKpiMocks({ leaveLogs: [] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'attendance')!;
    expect(metric.points).toBe(5);
  });

  it('Learning Velocity: ≥4h returns 5', async () => {
    setupUserKpiMocks({ learningLogs: [{ hours: 5 }] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'learning_velocity')!;
    expect(metric.points).toBe(5);
  });

  it('Innovation: AI_IMPLEMENTATION log returns 5', async () => {
    setupUserKpiMocks({ innovationLogs: [{ type: 'AI_IMPLEMENTATION' }] });
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const metric = result.metrics.find((m) => m.metricId === 'automation_innovation')!;
    expect(metric.points).toBe(5);
  });

  it('totalScore is sum of all metric points', async () => {
    setupUserKpiMocks({});
    const [result] = await service.getKpi('2026-05', 'user-1', true);
    const expectedTotal = result.metrics.reduce((s, m) => s + m.points, 0);
    expect(result.totalScore).toBeCloseTo(expectedTotal, 1);
  });
});

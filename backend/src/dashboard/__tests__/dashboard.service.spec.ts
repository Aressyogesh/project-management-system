import { BoardStatus, ProjectRole, ProjectStatus, SystemRole, TaskStatus } from '@prisma/client';
import { DashboardService } from '../dashboard.service';

const mockPrisma = {
  user: { count: jest.fn() },
  project: { count: jest.fn(), findMany: jest.fn() },
  task: { count: jest.fn(), findMany: jest.fn() },
  workItem: { count: jest.fn(), findFirst: jest.fn() },
  projectMember: { count: jest.fn(), findMany: jest.fn() },
};

function buildService() {
  return new DashboardService(mockPrisma as any);
}

const TASK_ROW = {
  id: 'task-001',
  title: 'Fix login bug',
  priority: 'HIGH' as const,
  status: TaskStatus.IN_PROGRESS,
  assignedTo: { fullName: 'Alice Smith' },
  project: { name: 'Alpha Project' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.count.mockResolvedValue(5);
  mockPrisma.project.count.mockResolvedValue(3);
  mockPrisma.project.findMany.mockResolvedValue([]);
  mockPrisma.task.count.mockResolvedValue(10);
  mockPrisma.task.findMany.mockResolvedValue([]);
  mockPrisma.workItem.count.mockResolvedValue(0);
  mockPrisma.workItem.findFirst.mockResolvedValue(null);
  mockPrisma.projectMember.count.mockResolvedValue(0);
  mockPrisma.projectMember.findMany.mockResolvedValue([]);
});

// ─── F-026 backend unit tests ─────────────────────────────────────────────────

// UTC-F026-B-001
it('getStats_SuperUser_ReturnsSystemWideCounts', async () => {
  mockPrisma.project.count.mockResolvedValue(5);
  mockPrisma.task.findMany.mockResolvedValue([]);
  mockPrisma.user.count.mockResolvedValue(20);
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.SUPER_USER);
  const activeProjectCard = result.cards.find((c) => c.label === 'Active Projects');
  expect(activeProjectCard?.value).toBe(5);
});

// UTC-F026-B-002
it('getStats_Employee_ReturnsOwnTaskCounts', async () => {
  mockPrisma.task.findMany.mockResolvedValue([TASK_ROW, TASK_ROW, TASK_ROW]);
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.EMPLOYEE);
  const myTaskCard = result.cards.find((c) => c.label === 'My Tasks');
  expect(myTaskCard?.value).toBe(3);
});

// UTC-F026-B-003
it('getStats_ReturnsActivityDataWith12Months', async () => {
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.SUPER_USER);
  expect(result.activityData).toHaveLength(12);
  result.activityData.forEach((point) => {
    expect(typeof point.month).toBe('string');
    expect(typeof point.high).toBe('number');
    expect(typeof point.low).toBe('number');
  });
});

// UTC-F026-B-004
it('getProjectsProgress_ReturnsOnlyActiveProjects', async () => {
  mockPrisma.project.findMany.mockResolvedValue([
    {
      id: 'p1',
      name: 'Project A',
      client: { name: 'Client A' },
      members: [{ projectRole: ProjectRole.PROJECT_MANAGER, user: { fullName: 'PM One' } }],
      workItems: [],
    },
    {
      id: 'p2',
      name: 'Project B',
      client: { name: 'Client B' },
      members: [],
      workItems: [],
    },
  ]);
  const service = buildService();
  const result = await service.getProjectsProgress('user-001', SystemRole.SUPER_USER);
  expect(result).toHaveLength(2);
  expect(result[0].name).toBe('Project A');
});

// UTC-F026-B-005
it('getProjectsProgress_CalculatesProgressCorrectly', async () => {
  const workItems = Array.from({ length: 10 }, (_, i) => ({
    id: `wi-${i}`,
    status: i < 4 ? BoardStatus.QA_DONE : BoardStatus.IN_PROGRESS,
    type: 'TASK',
  }));
  mockPrisma.project.findMany.mockResolvedValue([
    {
      id: 'p1',
      name: 'Project A',
      client: { name: 'Client A' },
      members: [],
      workItems,
    },
  ]);
  const service = buildService();
  const result = await service.getProjectsProgress('user-001', SystemRole.SUPER_USER);
  expect(result[0].progress).toBe(40);
  expect(result[0].completedTasks).toBe(4);
  expect(result[0].totalTasks).toBe(10);
});

// UTC-F026-B-006
it('getProjectsProgress_ZeroTasks_ReturnsZeroProgress', async () => {
  mockPrisma.project.findMany.mockResolvedValue([
    { id: 'p1', name: 'Empty Project', client: null, members: [], workItems: [] },
  ]);
  const service = buildService();
  const result = await service.getProjectsProgress('user-001', SystemRole.SUPER_USER);
  expect(result[0].progress).toBe(0);
  expect(result[0].totalTasks).toBe(0);
});

// UTC-F026-B-007
it('getProjectsProgress_IncludesTeamSizeAndOpenBugs', async () => {
  const workItems = [
    { id: 'wi-1', status: BoardStatus.TODO, type: 'BUG' },
    { id: 'wi-2', status: BoardStatus.IN_PROGRESS, type: 'BUG' },
    { id: 'wi-3', status: BoardStatus.QA_DONE, type: 'BUG' },
    { id: 'wi-4', status: BoardStatus.TODO, type: 'TASK' },
  ];
  mockPrisma.project.findMany.mockResolvedValue([
    {
      id: 'p1',
      name: 'Project X',
      client: { name: 'Client X' },
      members: [
        { projectRole: ProjectRole.DEVELOPER, user: { fullName: 'Dev One' } },
        { projectRole: ProjectRole.QA, user: { fullName: 'QA One' } },
        { projectRole: ProjectRole.PROJECT_MANAGER, user: { fullName: 'PM One' } },
      ],
      workItems,
    },
  ]);
  const service = buildService();
  const result = await service.getProjectsProgress('user-001', SystemRole.SUPER_USER);
  expect(result[0].teamSize).toBe(3);
  expect(result[0].openBugs).toBe(2);
});

// UTC-F026-B-008
it('getStats_TodayTask_ReturnsFirstTaskDueTodayNotCompleted', async () => {
  mockPrisma.workItem.findFirst.mockResolvedValue({
    title: 'Fix critical bug',
    status: BoardStatus.IN_PROGRESS,
  });
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.EMPLOYEE);
  expect(result.todayTask).not.toBeNull();
  expect(result.todayTask?.name).toBe('Fix critical bug');
});

// UTC-F026-B-009
it('getStats_NoTaskDueToday_ReturnsTodayTaskNull', async () => {
  mockPrisma.workItem.findFirst.mockResolvedValue(null);
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.EMPLOYEE);
  expect(result.todayTask).toBeNull();
});

// UTC-F026-B-010
it('getStats_TeamPerformance_CalculatesAvgCompletionRatio', async () => {
  mockPrisma.project.findMany.mockResolvedValue([
    { _count: { workItems: 10 }, workItems: Array(6).fill({ id: 'x' }) },
    { _count: { workItems: 20 }, workItems: Array(10).fill({ id: 'x' }) },
  ]);
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.SUPER_USER);
  expect(result.teamPerformance.score).toBe(55);
});

// ─── Backward-compat tests ────────────────────────────────────────────────────

it('DashboardService_getStats_ReturnsMyTasksForUser', async () => {
  mockPrisma.task.findMany.mockResolvedValue([TASK_ROW]);
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.ADMIN);
  expect(result.myTasks).toHaveLength(1);
  expect(result.myTasks[0].projectName).toBe('Alpha Project');
  expect(result.myTasks[0].taskName).toBe('Fix login bug');
});

it('DashboardService_getStats_EmptyMyTasksWhenNoneAssigned', async () => {
  mockPrisma.task.findMany.mockResolvedValue([]);
  const service = buildService();
  const result = await service.getStats('user-999', SystemRole.EMPLOYEE);
  expect(result.myTasks).toHaveLength(0);
});

it('DashboardService_getStats_AdminCardActiveProjectsIsLive', async () => {
  // ADMIN scopes to their memberships; mock 7 project memberships
  const memberships = Array.from({ length: 7 }, (_, i) => ({ projectId: `p${i}` }));
  mockPrisma.projectMember.findMany.mockResolvedValue(memberships);
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.ADMIN);
  const activeProjectCard = result.cards.find((c) => c.label === 'Active Projects');
  expect(activeProjectCard?.value).toBe(7);
});

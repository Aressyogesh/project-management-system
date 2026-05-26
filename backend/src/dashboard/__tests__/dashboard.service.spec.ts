import { SystemRole, TaskStatus } from '@prisma/client';
import { DashboardService } from '../dashboard.service';

const mockPrisma = {
  user: { count: jest.fn() },
  project: { count: jest.fn() },
  task: { count: jest.fn(), findMany: jest.fn() },
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
  mockPrisma.task.count.mockResolvedValue(10);
  mockPrisma.task.findMany.mockResolvedValue([]);
});

// UTC-F-014-B-001
it('DashboardService_getStats_ReturnsMyTasksForUser', async () => {
  mockPrisma.task.findMany.mockResolvedValue([TASK_ROW]);
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.ADMIN);
  expect(result.myTasks).toHaveLength(1);
  expect(result.myTasks[0].projectName).toBe('Alpha Project');
  expect(result.myTasks[0].taskName).toBe('Fix login bug');
});

// UTC-F-014-B-002
it('DashboardService_getStats_EmptyMyTasksWhenNoneAssigned', async () => {
  mockPrisma.task.findMany.mockResolvedValue([]);
  const service = buildService();
  const result = await service.getStats('user-999', SystemRole.EMPLOYEE);
  expect(result.myTasks).toHaveLength(0);
});

// UTC-F-014-B-003
it('DashboardService_getStats_TasksProgressHasCorrectCounts', async () => {
  mockPrisma.task.count
    .mockResolvedValueOnce(10) // total (first call in Promise.all)
    .mockResolvedValueOnce(2)  // completed tasks for card
    .mockResolvedValueOnce(3)  // NOT_STARTED
    .mockResolvedValueOnce(4)  // IN_PROGRESS
    .mockResolvedValueOnce(1)  // ON_REVIEW
    .mockResolvedValueOnce(2); // COMPLETED
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.ADMIN);
  expect(result.tasksProgress.notStarted).toBe(3);
  expect(result.tasksProgress.inProgress).toBe(4);
});

// UTC-F-014-B-004
it('DashboardService_getStats_AdminCardActiveProjectsIsLive', async () => {
  mockPrisma.project.count.mockResolvedValue(7);
  const service = buildService();
  const result = await service.getStats('user-001', SystemRole.ADMIN);
  const activeProjectCard = result.cards.find((c) => c.label === 'Active Projects');
  expect(activeProjectCard?.value).toBe(7);
});

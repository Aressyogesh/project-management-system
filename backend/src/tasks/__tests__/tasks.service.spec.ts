import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus, BillingStatus } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TasksService } from '../tasks.service';

const mockAuditLogs = { log: jest.fn() };

const mockProject = { id: 'proj-001' };
const mockTaskList = { id: 'tl-001', projectId: 'proj-001' };
const mockMilestone = { id: 'ms-001', projectId: 'proj-001' };
const mockTask = {
  id: 'task-001',
  projectId: 'proj-001',
  taskListId: 'tl-001',
  milestoneId: null,
  title: 'Implement login page',
  description: null,
  assignedToId: null,
  createdById: 'user-001',
  estimatedHours: null,
  priority: TaskPriority.MEDIUM,
  billingStatus: BillingStatus.BILLABLE,
  status: TaskStatus.NOT_STARTED,
  startDate: null,
  dueDate: null,
  createdAt: new Date(),
  taskList: { id: 'tl-001', name: 'Sprint 1', type: 'SPRINT' },
  milestone: null,
  assignedTo: null,
  createdBy: { id: 'user-001', fullName: 'Admin User' },
};

const prismaMock = {
  project: { findUnique: jest.fn() },
  taskList: { findUnique: jest.fn() },
  milestone: { findUnique: jest.fn() },
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  // UTC-F-011-B-001
  it('CreateTask_ValidData_ReturnsTask', async () => {
    prismaMock.project.findUnique.mockResolvedValue(mockProject);
    prismaMock.taskList.findUnique.mockResolvedValue(mockTaskList);
    prismaMock.task.create.mockResolvedValue(mockTask);

    const result = await service.create('proj-001', {
      title: 'Implement login page',
      taskListId: 'tl-001',
    }, 'user-001');

    expect(result.title).toBe('Implement login page');
    expect(result.status).toBe(TaskStatus.NOT_STARTED);
  });

  // UTC-F-011-B-002
  it('CreateTask_ProjectNotFound_ThrowsNotFoundException', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(
      service.create('bad-id', { title: 'Task', taskListId: 'tl-001' }, 'user-001'),
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  // UTC-F-011-B-003
  it('CreateTask_TaskListNotInProject_ThrowsBadRequest', async () => {
    prismaMock.project.findUnique.mockResolvedValue(mockProject);
    prismaMock.taskList.findUnique.mockResolvedValue({ id: 'tl-999', projectId: 'other-project' });

    await expect(
      service.create('proj-001', { title: 'Task', taskListId: 'tl-999' }, 'user-001'),
    ).rejects.toThrow(BadRequestException);
  });

  // UTC-F-011-B-004
  it('CreateTask_MilestoneNotInProject_ThrowsBadRequest', async () => {
    prismaMock.project.findUnique.mockResolvedValue(mockProject);
    prismaMock.taskList.findUnique.mockResolvedValue(mockTaskList);
    prismaMock.milestone.findUnique.mockResolvedValue({ id: 'ms-999', projectId: 'other-project' });

    await expect(
      service.create('proj-001', { title: 'Task', taskListId: 'tl-001', milestoneId: 'ms-999' }, 'user-001'),
    ).rejects.toThrow(BadRequestException);
  });

  // UTC-F-011-B-005
  it('UpdateTask_ValidData_ReturnsUpdatedTask', async () => {
    prismaMock.task.findUnique.mockResolvedValue(mockTask);
    const updated = { ...mockTask, title: 'Updated title' };
    prismaMock.task.update.mockResolvedValue(updated);

    const result = await service.update('task-001', { title: 'Updated title' });

    expect(result.title).toBe('Updated title');
  });

  // UTC-F-011-B-006
  it('UpdateTask_NotFound_ThrowsNotFoundException', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(service.update('bad-id', { title: 'X' })).rejects.toThrow(NotFoundException);
  });

  // UTC-F-011-B-007
  it('UpdateTask_StatusChange_ReturnsUpdatedStatus', async () => {
    prismaMock.task.findUnique.mockResolvedValue(mockTask);
    const updated = { ...mockTask, status: TaskStatus.IN_PROGRESS };
    prismaMock.task.update.mockResolvedValue(updated);

    const result = await service.update('task-001', { status: TaskStatus.IN_PROGRESS });

    expect(result.status).toBe(TaskStatus.IN_PROGRESS);
  });

  // UTC-F-011-B-008
  it('DeleteTask_ValidId_DeletesTask', async () => {
    prismaMock.task.findUnique.mockResolvedValue(mockTask);
    prismaMock.task.delete.mockResolvedValue(mockTask);

    await service.remove('task-001');

    expect(prismaMock.task.delete).toHaveBeenCalledTimes(1);
  });

  // UTC-F-011-B-009
  it('DeleteTask_NotFound_ThrowsNotFoundException', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    expect(prismaMock.task.delete).not.toHaveBeenCalled();
  });

  // UTC-F-011-B-010
  it('ListTasks_ValidProject_ReturnsList', async () => {
    prismaMock.project.findUnique.mockResolvedValue(mockProject);
    prismaMock.task.findMany.mockResolvedValue([mockTask]);

    const result = await service.findAll('proj-001');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Implement login page');
  });

  // UTC-F-011-B-011
  it('GetTask_ValidId_ReturnsTask', async () => {
    prismaMock.task.findUnique.mockResolvedValue(mockTask);

    const result = await service.findOne('task-001');

    expect(result.title).toBe('Implement login page');
  });
});

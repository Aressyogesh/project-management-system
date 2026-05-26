import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskListType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskListsService } from '../task-lists.service';

const mockProject = { id: 'proj-001', name: 'Alpha' };
const mockTaskList = {
  id: 'tl-001',
  name: 'Sprint 1 Tasks',
  type: TaskListType.SPRINT,
  sprintNumber: 1,
  description: null,
  createdAt: new Date(),
};

const prismaMock = {
  project: { findUnique: jest.fn() },
  taskList: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TaskListsService', () => {
  let service: TaskListsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskListsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<TaskListsService>(TaskListsService);
    jest.clearAllMocks();
  });

  // UTC-F-010-B-001
  it('CreateTaskList_ValidData_ReturnsTaskList', async () => {
    prismaMock.project.findUnique.mockResolvedValue(mockProject);
    prismaMock.taskList.create.mockResolvedValue(mockTaskList);

    const result = await service.create('proj-001', {
      name: 'Sprint 1 Tasks',
      type: TaskListType.SPRINT,
      sprintNumber: 1,
    });

    expect(result.type).toBe(TaskListType.SPRINT);
    expect(result.sprintNumber).toBe(1);
  });

  // UTC-F-010-B-002
  it('CreateTaskList_ProjectNotFound_ThrowsNotFoundException', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(
      service.create('bad-id', { name: 'Test', type: TaskListType.GENERAL }),
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.taskList.create).not.toHaveBeenCalled();
  });

  // UTC-F-010-B-003
  it('CreateTaskList_SprintType_NoSprintNumber_ThrowsBadRequest', async () => {
    prismaMock.project.findUnique.mockResolvedValue(mockProject);

    await expect(
      service.create('proj-001', { name: 'Sprint', type: TaskListType.SPRINT }),
    ).rejects.toThrow(BadRequestException);
  });

  // UTC-F-010-B-004
  it('CreateTaskList_NonSprintType_SprintNumberSetToNull', async () => {
    prismaMock.project.findUnique.mockResolvedValue(mockProject);
    const generalList = { ...mockTaskList, type: TaskListType.GENERAL, sprintNumber: null };
    prismaMock.taskList.create.mockResolvedValue(generalList);

    const result = await service.create('proj-001', {
      name: 'General Tasks',
      type: TaskListType.GENERAL,
      sprintNumber: 99,
    });

    expect(result.sprintNumber).toBeNull();
  });

  // UTC-F-010-B-005
  it('UpdateTaskList_ValidData_ReturnsUpdated', async () => {
    prismaMock.taskList.findUnique.mockResolvedValue(mockTaskList);
    const updated = { ...mockTaskList, name: 'Sprint 1 — Revised' };
    prismaMock.taskList.update.mockResolvedValue(updated);

    const result = await service.update('tl-001', { name: 'Sprint 1 — Revised' });

    expect(result.name).toBe('Sprint 1 — Revised');
  });

  // UTC-F-010-B-006
  it('UpdateTaskList_NotFound_ThrowsNotFoundException', async () => {
    prismaMock.taskList.findUnique.mockResolvedValue(null);

    await expect(service.update('bad-id', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  // UTC-F-010-B-007
  it('DeleteTaskList_ValidId_Deletes', async () => {
    prismaMock.taskList.findUnique.mockResolvedValue(mockTaskList);
    prismaMock.taskList.delete.mockResolvedValue(mockTaskList);

    await service.remove('tl-001');

    expect(prismaMock.taskList.delete).toHaveBeenCalledTimes(1);
  });

  // UTC-F-010-B-008
  it('DeleteTaskList_NotFound_ThrowsNotFoundException', async () => {
    prismaMock.taskList.findUnique.mockResolvedValue(null);

    await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    expect(prismaMock.taskList.delete).not.toHaveBeenCalled();
  });

  // UTC-F-010-B-009
  it('ListTaskLists_ValidProject_ReturnsList', async () => {
    prismaMock.project.findUnique.mockResolvedValue(mockProject);
    prismaMock.taskList.findMany.mockResolvedValue([mockTaskList]);

    const result = await service.findAll('proj-001');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sprint 1 Tasks');
  });
});

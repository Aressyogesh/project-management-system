import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskAllocationsService } from '../task-allocations.service';

const mockPrisma = {
  task: { findUnique: jest.fn() },
  taskAllocation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
};

const mockTask = { id: 'task-001', title: 'Fix bug', projectId: 'proj-001' };
const mockUser = { id: 'user-001', fullName: 'Alice', profilePhoto: null };

const mockAllocation = {
  id: 'alloc-001',
  date: new Date('2026-06-01'),
  allocatedHours: 4,
  task: { id: 'task-001', title: 'Fix bug', projectId: 'proj-001' },
  user: { id: 'user-001', fullName: 'Alice', profilePhoto: null },
};

const zeroAgg = { _sum: { allocatedHours: null } };
const makeAgg = (hours: number) => ({ _sum: { allocatedHours: hours } });

describe('TaskAllocationsService', () => {
  let service: TaskAllocationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAllocationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TaskAllocationsService>(TaskAllocationsService);
  });

  afterEach(() => jest.resetAllMocks());

  // UTC-F017-B-001
  it('CreateAllocation_ValidData_ReturnsAllocation', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(mockTask);
    mockPrisma.taskAllocation.aggregate.mockResolvedValue(zeroAgg);
    mockPrisma.taskAllocation.create.mockResolvedValue(mockAllocation);

    const result = await service.create({
      taskId: 'task-001',
      userId: 'user-001',
      date: '2026-06-01',
      allocatedHours: 4,
    });

    expect(result.allocatedHours).toBe(4);
    expect(mockPrisma.taskAllocation.create).toHaveBeenCalledTimes(1);
  });

  // UTC-F017-B-002
  it('CreateAllocation_TaskNotFound_ThrowsNotFound', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        taskId: 'bad-task',
        userId: 'user-001',
        date: '2026-06-01',
        allocatedHours: 4,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(mockPrisma.taskAllocation.create).not.toHaveBeenCalled();
  });

  // UTC-F017-B-003
  it('CreateAllocation_ExceedsDailyCap_ThrowsUnprocessableEntity', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(mockTask);
    mockPrisma.taskAllocation.aggregate.mockResolvedValue(makeAgg(6));

    await expect(
      service.create({
        taskId: 'task-001',
        userId: 'user-001',
        date: '2026-06-01',
        allocatedHours: 3,
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(mockPrisma.taskAllocation.create).not.toHaveBeenCalled();
  });

  // UTC-F017-B-004
  it('CreateAllocation_ExactlyAtCap_Succeeds', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(mockTask);
    mockPrisma.taskAllocation.aggregate.mockResolvedValue(makeAgg(4));
    mockPrisma.taskAllocation.create.mockResolvedValue({
      ...mockAllocation,
      allocatedHours: 4,
    });

    const result = await service.create({
      taskId: 'task-001',
      userId: 'user-001',
      date: '2026-06-01',
      allocatedHours: 4,
    });

    expect(result.allocatedHours).toBe(4);
  });

  // UTC-F017-B-005
  it('CreateAllocation_DuplicateEntry_ThrowsConflict', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(mockTask);
    mockPrisma.taskAllocation.aggregate.mockResolvedValue(zeroAgg);
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    mockPrisma.taskAllocation.create.mockRejectedValue(p2002);

    await expect(
      service.create({
        taskId: 'task-001',
        userId: 'user-001',
        date: '2026-06-01',
        allocatedHours: 2,
      }),
    ).rejects.toThrow(ConflictException);
  });

  // UTC-F017-B-006
  it('UpdateAllocation_ValidData_ReturnsUpdated', async () => {
    mockPrisma.taskAllocation.findUnique.mockResolvedValue({
      ...mockAllocation,
      userId: 'user-001',
      date: new Date('2026-06-01'),
    });
    mockPrisma.taskAllocation.aggregate.mockResolvedValue(makeAgg(2));
    mockPrisma.taskAllocation.update.mockResolvedValue({
      ...mockAllocation,
      allocatedHours: 5,
    });

    const result = await service.update('alloc-001', { allocatedHours: 5 });
    expect(result.allocatedHours).toBe(5);
    expect(mockPrisma.taskAllocation.update).toHaveBeenCalledTimes(1);
  });

  // UTC-F017-B-007
  it('UpdateAllocation_NotFound_ThrowsNotFound', async () => {
    mockPrisma.taskAllocation.findUnique.mockResolvedValue(null);

    await expect(
      service.update('bad-id', { allocatedHours: 3 }),
    ).rejects.toThrow(NotFoundException);
  });

  // UTC-F017-B-008
  it('UpdateAllocation_ExceedsCap_ThrowsUnprocessableEntity', async () => {
    mockPrisma.taskAllocation.findUnique.mockResolvedValue({
      ...mockAllocation,
      userId: 'user-001',
      date: new Date('2026-06-01'),
    });
    // Other allocations already occupy 7h (excluding this one)
    mockPrisma.taskAllocation.aggregate.mockResolvedValue(makeAgg(7));

    await expect(
      service.update('alloc-001', { allocatedHours: 2 }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // UTC-F017-B-009
  it('DeleteAllocation_Exists_Deletes', async () => {
    mockPrisma.taskAllocation.findUnique.mockResolvedValue(mockAllocation);
    mockPrisma.taskAllocation.delete.mockResolvedValue(mockAllocation);

    await service.remove('alloc-001');
    expect(mockPrisma.taskAllocation.delete).toHaveBeenCalledWith({
      where: { id: 'alloc-001' },
    });
  });

  // UTC-F017-B-010
  it('DeleteAllocation_NotFound_ThrowsNotFound', async () => {
    mockPrisma.taskAllocation.findUnique.mockResolvedValue(null);

    await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    expect(mockPrisma.taskAllocation.delete).not.toHaveBeenCalled();
  });

  // UTC-F017-B-011
  it('CheckAllocation_ReturnsAllocatedAndRemaining', async () => {
    mockPrisma.taskAllocation.aggregate.mockResolvedValue(makeAgg(3));

    const result = await service.check('user-001', '2026-06-01');
    expect(result.allocatedHours).toBe(3);
    expect(result.remainingHours).toBe(5);
  });

  // UTC-F017-B-012
  it('CheckAllocation_FullDay_RemainingIsZero', async () => {
    mockPrisma.taskAllocation.aggregate.mockResolvedValue(makeAgg(8));

    const result = await service.check('user-001', '2026-06-01');
    expect(result.allocatedHours).toBe(8);
    expect(result.remainingHours).toBe(0);
  });

  // UTC-F017-B-013
  it('FindByProject_ReturnsFilteredAllocations', async () => {
    mockPrisma.taskAllocation.findMany.mockResolvedValue([mockAllocation]);

    const result = await service.findByProject('proj-001');
    expect(result).toHaveLength(1);
    expect(mockPrisma.taskAllocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task: { projectId: 'proj-001' } },
      }),
    );
  });
});

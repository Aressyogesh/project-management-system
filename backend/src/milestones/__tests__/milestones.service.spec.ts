import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MilestonesService } from '../milestones.service';

const mockPrisma = {
  project: { findUnique: jest.fn() },
  milestone: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

const mockProject = { id: 'proj-001', name: 'Alpha App' };
const mockMilestone = {
  id: 'ms-001',
  description: 'Phase 1 Delivery',
  deliveryNote: null,
  startDate: null,
  dueDate: null,
  status: 'NOT_STARTED',
  createdAt: new Date(),
  responsibleUser: null,
};
const mockMilestoneRow = {
  ...mockMilestone,
  _count: { tasks: 0 },
  tasks: [],
};

function makeRow(completedCount: number, totalCount: number) {
  return {
    ...mockMilestone,
    _count: { tasks: totalCount },
    tasks: Array.from({ length: completedCount }, (_, i) => ({ id: `t${i}` })),
  };
}

describe('MilestonesService', () => {
  let service: MilestonesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestonesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<MilestonesService>(MilestonesService);
    jest.resetAllMocks();
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.$executeRaw.mockResolvedValue(0);
  });

  // UTC-F-009-B-001
  it('CreateMilestone_ValidData_ReturnsMilestone', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.milestone.create.mockResolvedValue(mockMilestone);

    const result = await service.create('proj-001', { description: 'Phase 1 Delivery' });
    expect(result.description).toBe('Phase 1 Delivery');
    expect(mockPrisma.milestone.create).toHaveBeenCalledTimes(1);
  });

  // UTC-F-009-B-002
  it('CreateMilestone_ProjectNotFound_ThrowsNotFoundException', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(service.create('bad-id', { description: 'X' })).rejects.toThrow(NotFoundException);
    expect(mockPrisma.milestone.create).not.toHaveBeenCalled();
  });

  // UTC-F-009-B-003
  it('CreateMilestone_EndBeforeStart_ThrowsBadRequestException', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    await expect(
      service.create('proj-001', { description: 'X', startDate: '2026-07-10', dueDate: '2026-07-01' }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.milestone.create).not.toHaveBeenCalled();
  });

  // UTC-F-009-B-004
  it('UpdateMilestone_ValidData_ReturnsUpdatedMilestone', async () => {
    mockPrisma.milestone.findUnique.mockResolvedValue(mockMilestone);
    mockPrisma.milestone.update.mockResolvedValue({ ...mockMilestone, description: 'Phase 2 Delivery' });

    const result = await service.update('ms-001', { description: 'Phase 2 Delivery' });
    expect(result.description).toBe('Phase 2 Delivery');
  });

  // UTC-F-009-B-005
  it('UpdateMilestone_NotFound_ThrowsNotFoundException', async () => {
    mockPrisma.milestone.findUnique.mockResolvedValue(null);
    await expect(service.update('bad-id', { description: 'X' })).rejects.toThrow(NotFoundException);
  });

  // UTC-F-009-B-006
  it('DeleteMilestone_ValidId_DeletesMilestone', async () => {
    mockPrisma.milestone.findUnique.mockResolvedValue(mockMilestone);
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: BigInt(0) }]);
    mockPrisma.milestone.delete.mockResolvedValue(mockMilestone);

    await service.remove('ms-001');
    expect(mockPrisma.milestone.delete).toHaveBeenCalledTimes(1);
  });

  // UTC-F-009-B-007
  it('DeleteMilestone_NotFound_ThrowsNotFoundException', async () => {
    mockPrisma.milestone.findUnique.mockResolvedValue(null);
    await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    expect(mockPrisma.milestone.delete).not.toHaveBeenCalled();
  });

  // UTC-F-009-B-008
  it('ListMilestones_ValidProject_ReturnsList', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.milestone.findMany.mockResolvedValue([mockMilestoneRow]);

    const result = await service.findAll('proj-001');
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Phase 1 Delivery');
  });

  // UTC-F016-B-001
  it('findAll_MilestoneWithPartialCompletion_ReturnsCorrectProgress', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.milestone.findMany.mockResolvedValueOnce([makeRow(3, 5)]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])  // fetchNames
      .mockResolvedValueOnce([{ milestoneId: 'ms-001', total: BigInt(5), completed: BigInt(3) }]);
    const result = await service.findAll('proj-001');
    expect(result[0].totalTasks).toBe(5);
    expect(result[0].completedTasks).toBe(3);
    expect(result[0].progressPercent).toBe(60);
  });

  // UTC-F016-B-002
  it('findAll_MilestoneWithNoTasks_ReturnsZeroProgress', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.milestone.findMany.mockResolvedValueOnce([makeRow(0, 0)]);
    // default $queryRaw mock returns [] — statsMap empty → total/completed = 0
    const result = await service.findAll('proj-001');
    expect(result[0].totalTasks).toBe(0);
    expect(result[0].completedTasks).toBe(0);
    expect(result[0].progressPercent).toBe(0);
  });

  // UTC-F016-B-003
  it('findAll_AllTasksCompleted_Returns100Percent', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.milestone.findMany.mockResolvedValueOnce([makeRow(3, 3)]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ milestoneId: 'ms-001', total: BigInt(3), completed: BigInt(3) }]);
    const result = await service.findAll('proj-001');
    expect(result[0].progressPercent).toBe(100);
  });

  // UTC-F016-B-004
  it('findAll_MultipleMilestones_EachHasIndependentProgress', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.milestone.findMany.mockResolvedValueOnce([
      { ...makeRow(2, 4), id: 'ms-1' },
      { ...makeRow(2, 2), id: 'ms-2' },
    ]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])  // fetchNames
      .mockResolvedValueOnce([
        { milestoneId: 'ms-1', total: BigInt(4), completed: BigInt(2) },
        { milestoneId: 'ms-2', total: BigInt(2), completed: BigInt(2) },
      ]);
    const result = await service.findAll('proj-001');
    expect(result[0].progressPercent).toBe(50);
    expect(result[1].progressPercent).toBe(100);
  });

  // UTC-F016-B-005
  it('findAll_ProgressPercent_RoundsToNearestInteger', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.milestone.findMany.mockResolvedValueOnce([makeRow(1, 3)]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ milestoneId: 'ms-001', total: BigInt(3), completed: BigInt(1) }]);
    const result = await service.findAll('proj-001');
    expect(result[0].progressPercent).toBe(33);
  });
});

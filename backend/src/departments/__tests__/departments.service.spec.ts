import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { DepartmentsService } from '../departments.service';

const mockPrisma = {
  department: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockDept = { id: 'dept-001', name: 'Digital', isActive: true, createdAt: new Date() };

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DepartmentsService>(DepartmentsService);
    jest.clearAllMocks();
  });

  // UTC-F-005-B-001
  it('CreateDepartment_UniqueName_ReturnsCreatedDepartment', async () => {
    mockPrisma.department.findFirst.mockResolvedValue(null);
    mockPrisma.department.create.mockResolvedValue({ ...mockDept, name: 'Engineering' });

    const result = await service.create({ name: 'Engineering' });

    expect(result.name).toBe('Engineering');
    expect(mockPrisma.department.create).toHaveBeenCalledTimes(1);
  });

  // UTC-F-005-B-002
  it('CreateDepartment_DuplicateName_ThrowsConflictException', async () => {
    mockPrisma.department.findFirst.mockResolvedValue(mockDept);

    await expect(service.create({ name: 'Digital' })).rejects.toThrow(ConflictException);
    expect(mockPrisma.department.create).not.toHaveBeenCalled();
  });

  // UTC-F-005-B-003
  it('UpdateDepartment_ValidName_ReturnsUpdatedDepartment', async () => {
    mockPrisma.department.findUnique.mockResolvedValue(mockDept);
    mockPrisma.department.findFirst.mockResolvedValue(null);
    mockPrisma.department.update.mockResolvedValue({ ...mockDept, name: 'Mobile Dev' });

    const result = await service.update('dept-001', { name: 'Mobile Dev' });
    expect(result.name).toBe('Mobile Dev');
  });

  // UTC-F-005-B-004
  it('UpdateDepartment_NotFound_ThrowsNotFoundException', async () => {
    mockPrisma.department.findUnique.mockResolvedValue(null);

    await expect(service.update('bad-id', { name: 'X' })).rejects.toThrow(NotFoundException);
  });

  // UTC-F-005-B-005
  it('SetStatus_ValidId_TogglesIsActive', async () => {
    mockPrisma.department.findUnique.mockResolvedValue(mockDept);
    mockPrisma.department.update.mockResolvedValue({ ...mockDept, isActive: false });

    const result = await service.setStatus('dept-001', false);

    expect(result.isActive).toBe(false);
    expect(mockPrisma.department.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  // UTC-F-005-B-006
  it('FindAll_IncludeInactive_ReturnsAllDepartments', async () => {
    const inactive = { ...mockDept, id: 'dept-002', isActive: false };
    mockPrisma.department.findMany.mockResolvedValue([mockDept, inactive]);

    const result = await service.findAll(true);

    expect(result.length).toBe(2);
    expect(mockPrisma.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../projects.service';

const mockPrisma = {
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

const mockProject = {
  id: 'proj-001',
  name: 'Alpha App',
  description: null,
  startDate: null,
  endDate: null,
  budget: null,
  projectType: 'DEDICATED',
  status: 'ACTIVE',
  createdAt: new Date(),
  client: null,
  department: null,
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  // UTC-F-007-B-001
  it('CreateProject_ValidData_ReturnsCreatedProject', async () => {
    mockPrisma.project.create.mockResolvedValue(mockProject);

    const result = await service.create({ name: 'Alpha App', projectType: 'DEDICATED' as any });

    expect(result.name).toBe('Alpha App');
    expect(mockPrisma.project.create).toHaveBeenCalledTimes(1);
  });

  // UTC-F-007-B-002
  it('CreateProject_EndDateBeforeStartDate_ThrowsBadRequestException', async () => {
    await expect(
      service.create({ name: 'X', projectType: 'FIXED' as any, startDate: '2026-07-10', endDate: '2026-07-01' }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.project.create).not.toHaveBeenCalled();
  });

  // UTC-F-007-B-003
  it('UpdateProject_ValidData_ReturnsUpdatedProject', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.project.update.mockResolvedValue({ ...mockProject, name: 'Beta' });

    const result = await service.update('proj-001', { name: 'Beta' });
    expect(result.name).toBe('Beta');
  });

  // UTC-F-007-B-004
  it('UpdateProject_NotFound_ThrowsNotFoundException', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    await expect(service.update('bad-id', { name: 'X' })).rejects.toThrow(NotFoundException);
  });

  // UTC-F-007-B-005
  it('SetStatus_Archive_UpdatesStatusToArchive', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.project.update.mockResolvedValue({ ...mockProject, status: 'ARCHIVE' });

    const result = await service.setStatus('proj-001', 'ARCHIVE' as any);
    expect(result.status).toBe('ARCHIVE');
  });

  // UTC-F-007-B-006
  it('GetSummary_ReturnsCorrectCounts', async () => {
    const pastDate = new Date('2020-01-01');
    mockPrisma.project.findMany.mockResolvedValue([
      { status: 'ACTIVE', projectType: 'DEDICATED', endDate: pastDate },
      { status: 'ACTIVE', projectType: 'T_AND_M', endDate: tomorrow },
      { status: 'ARCHIVE', projectType: 'FIXED', endDate: null },
    ]);

    const result = await service.getSummary();

    expect(result.active).toBe(2);
    expect(result.archive).toBe(1);
    expect(result.dedicated).toBe(1);
    expect(result.overdue).toBe(1);
  });

  // UTC-F-007-B-007
  it('FindAll_WithStatusFilter_ReturnsFilteredProjects', async () => {
    mockPrisma.project.findMany.mockResolvedValue([mockProject]);

    await service.findAll({ status: 'ACTIVE' as any });

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
  });
});

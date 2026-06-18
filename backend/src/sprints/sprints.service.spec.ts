import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AutomationService } from '../automation-services/automation.service';
import { SprintsService } from './sprints.service';

const mockPrisma = {
  sprint: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const mockAuditLogs = { log: jest.fn() };
const mockAutomation = { notifySprintStarted: jest.fn() };

const baseSprint = {
  id: 's-1',
  projectId: 'p-1',
  name: 'Sprint 1',
  goal: null,
  startDate: null,
  endDate: null,
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ACTOR = 'actor-123';

describe('SprintsService', () => {
  let service: SprintsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
        { provide: AutomationService, useValue: mockAutomation },
      ],
    }).compile();

    service = module.get<SprintsService>(SprintsService);
    jest.clearAllMocks();
  });

  describe('setActive()', () => {
    it('deactivates all sprints in project before activating target', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue({ ...baseSprint, isActive: false });
      mockPrisma.sprint.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.sprint.update.mockResolvedValue({ ...baseSprint, isActive: true });

      await service.setActive('s-1', 'p-1', ACTOR);

      expect(mockPrisma.sprint.updateMany).toHaveBeenCalledWith({
        where: { projectId: 'p-1' },
        data: { isActive: false },
      });
      expect(mockPrisma.sprint.update).toHaveBeenCalledWith({
        where: { id: 's-1' },
        data: { isActive: true },
      });
    });

    it('throws NotFoundException when sprint not found', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue(null);
      await expect(service.setActive('s-999', 'p-1', ACTOR)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByProject()', () => {
    it('returns sprints ordered by createdAt ascending', async () => {
      const sprints = [{ ...baseSprint }, { ...baseSprint, id: 's-2' }];
      mockPrisma.sprint.findMany.mockResolvedValue(sprints);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.findByProject('p-1');
      expect(result).toHaveLength(2);
      expect(mockPrisma.sprint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: 'p-1' } }),
      );
    });
  });

  describe('remove()', () => {
    it('deletes the sprint', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue(baseSprint);
      mockPrisma.sprint.delete.mockResolvedValue(baseSprint);

      await service.remove('s-1', ACTOR);
      expect(mockPrisma.sprint.delete).toHaveBeenCalledWith({ where: { id: 's-1' } });
    });

    it('throws NotFoundException for unknown sprint', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue(null);
      await expect(service.remove('s-999', ACTOR)).rejects.toThrow(NotFoundException);
    });
  });
});

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BoardStatus, ProjectRole, SystemRole, WorkItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkItemsService } from './work-items.service';

const mockPrisma = {
  workItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  workItemComment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

const baseItem = {
  id: 'wi-1',
  projectId: 'p-1',
  type: WorkItemType.TASK,
  status: BoardStatus.TODO,
  title: 'Test task',
  priority: 'MEDIUM',
  reporterId: 'u-reporter',
  assigneeId: 'u-assignee',
  storyPoints: null,
  estimatedHours: null,
  labels: [],
  components: [],
  completedAt: null,
  reopenCount: 0,
  position: 0,
};

describe('WorkItemsService', () => {
  let service: WorkItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkItemsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkItemsService>(WorkItemsService);
    jest.clearAllMocks();
  });

  // ─── move() ──────────────────────────────────────────────────────────────────

  describe('move()', () => {
    it('sets completedAt when moving to QA_DONE', async () => {
      mockPrisma.workItem.findUnique.mockResolvedValue({ ...baseItem, status: BoardStatus.QA });
      mockPrisma.workItem.update.mockResolvedValue({});

      await service.move('wi-1', 'user-1', { status: BoardStatus.QA_DONE, position: 0 });

      expect(mockPrisma.workItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: expect.any(Date) }),
        }),
      );
    });

    it('clears completedAt when moving back from QA_DONE', async () => {
      mockPrisma.workItem.findUnique.mockResolvedValue({ ...baseItem, status: BoardStatus.QA_DONE, completedAt: new Date() });
      mockPrisma.workItem.update.mockResolvedValue({});

      await service.move('wi-1', 'user-1', { status: BoardStatus.QA, position: 0 });

      expect(mockPrisma.workItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: null }),
        }),
      );
    });

    it('increments reopenCount on backward move', async () => {
      mockPrisma.workItem.findUnique.mockResolvedValue({ ...baseItem, status: BoardStatus.IN_REVIEW });
      mockPrisma.workItem.update.mockResolvedValue({});

      await service.move('wi-1', 'user-1', { status: BoardStatus.IN_PROGRESS, position: 0 });

      expect(mockPrisma.workItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reopenCount: { increment: 1 } }),
        }),
      );
    });

    it('does NOT increment reopenCount on forward move', async () => {
      mockPrisma.workItem.findUnique.mockResolvedValue({ ...baseItem, status: BoardStatus.TODO });
      mockPrisma.workItem.update.mockResolvedValue({});

      await service.move('wi-1', 'user-1', { status: BoardStatus.IN_PROGRESS, position: 0 });

      const updateCall = mockPrisma.workItem.update.mock.calls[0][0];
      expect(updateCall.data.reopenCount).toBeUndefined();
    });

    it('throws NotFoundException when item not found', async () => {
      mockPrisma.workItem.findUnique.mockResolvedValue(null);
      await expect(service.move('wi-999', 'user-1', { status: BoardStatus.TODO, position: 0 }))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ─── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('throws BadRequestException when SUB_TASK has EPIC as parent', async () => {
      mockPrisma.workItem.findUnique.mockResolvedValue({ type: WorkItemType.EPIC });

      await expect(
        service.create('p-1', 'u-1', {
          type: WorkItemType.SUB_TASK,
          title: 'Sub task',
          parentId: 'wi-epic',
          priority: 'MEDIUM',
          labels: [],
          components: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates item without parent when parentId is undefined', async () => {
      mockPrisma.workItem.create.mockResolvedValue({ ...baseItem });

      await service.create('p-1', 'u-1', {
        type: WorkItemType.TASK,
        title: 'Task',
        priority: 'MEDIUM',
        labels: [],
        components: [],
      } as any);

      expect(mockPrisma.workItem.create).toHaveBeenCalled();
    });
  });

  // ─── update() ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('throws ForbiddenException when non-owner DEVELOPER tries to update', async () => {
      mockPrisma.workItem.findUnique.mockResolvedValue({
        ...baseItem,
        assigneeId: 'other-user',
        reporterId: 'other-reporter',
      });

      await expect(
        service.update('wi-1', 'u-current', SystemRole.EMPLOYEE, ProjectRole.DEVELOPER, { title: 'New title' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to update any item', async () => {
      mockPrisma.workItem.findUnique.mockResolvedValue({ ...baseItem });
      mockPrisma.workItem.update.mockResolvedValue({ ...baseItem, title: 'Updated' });

      await service.update('wi-1', 'u-admin', SystemRole.ADMIN, null, { title: 'Updated' } as any);

      expect(mockPrisma.workItem.update).toHaveBeenCalled();
    });
  });
});

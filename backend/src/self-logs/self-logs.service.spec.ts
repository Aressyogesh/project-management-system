import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SystemRole } from '@prisma/client';
import { SelfLogsService } from './self-logs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SelfLogsService', () => {
  let service: SelfLogsService;
  let prisma: {
    leaveLog: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
    learningLog: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
    innovationLog: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      leaveLog: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      learningLog: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      innovationLog: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        SelfLogsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SelfLogsService);
  });

  describe('LeaveLog', () => {
    it('createLeaveLog creates entry', async () => {
      prisma.leaveLog.create.mockResolvedValue({ id: '1' });
      const result = await service.createLeaveLog('user-1', {
        date: '2026-05-10',
        type: 'APPROVED',
      });
      expect(result).toEqual({ id: '1' });
    });

    it('createLeaveLog throws ConflictException on P2002', async () => {
      prisma.leaveLog.create.mockRejectedValue({ code: 'P2002' });
      await expect(
        service.createLeaveLog('user-1', { date: '2026-05-10', type: 'APPROVED' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deleteLeaveLog allows owner to delete own entry', async () => {
      prisma.leaveLog.findUnique.mockResolvedValue({ id: '1', userId: 'user-1' });
      prisma.leaveLog.delete.mockResolvedValue({ id: '1' });
      await expect(
        service.deleteLeaveLog('1', 'user-1', SystemRole.EMPLOYEE),
      ).resolves.not.toThrow();
    });

    it('deleteLeaveLog throws ForbiddenException for non-owner', async () => {
      prisma.leaveLog.findUnique.mockResolvedValue({ id: '1', userId: 'other-user' });
      await expect(
        service.deleteLeaveLog('1', 'user-2', SystemRole.EMPLOYEE),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deleteLeaveLog throws NotFoundException when not found', async () => {
      prisma.leaveLog.findUnique.mockResolvedValue(null);
      await expect(
        service.deleteLeaveLog('nonexistent', 'user-1', SystemRole.EMPLOYEE),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('LearningLog', () => {
    it('createLearningLog creates entry', async () => {
      prisma.learningLog.create.mockResolvedValue({ id: '2' });
      const result = await service.createLearningLog('user-1', {
        period: '2026-05',
        topic: 'React',
        hours: 3,
      });
      expect(result).toEqual({ id: '2' });
    });
  });

  describe('InnovationLog', () => {
    it('createInnovationLog creates entry', async () => {
      prisma.innovationLog.create.mockResolvedValue({ id: '3' });
      const result = await service.createInnovationLog('user-1', {
        period: '2026-05',
        title: 'AI feature',
        impact: 'Saved 2h/day',
        type: 'AI_IMPLEMENTATION',
      });
      expect(result).toEqual({ id: '3' });
    });
  });
});

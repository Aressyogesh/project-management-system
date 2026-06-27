import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementScope, SystemRole } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const mockAuditLogs = { log: jest.fn() };

const mockPrisma = {
  announcement: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  projectMember: {
    findMany: jest.fn(),
  },
};

const mockAnnouncement = {
  id: 'ann-uuid',
  title: 'Team Meeting',
  content: 'All hands at 3pm',
  scope: AnnouncementScope.GLOBAL,
  projectId: null,
  project: null,
  createdAt: new Date('2026-06-26T10:00:00Z'),
  createdBy: { id: 'admin-uuid', fullName: 'Yogesh Lolage', profilePhoto: null },
};

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();
    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  describe('create', () => {
    it('UTC-F055-B-001: admin can create GLOBAL announcement', async () => {
      mockPrisma.announcement.create.mockResolvedValue(mockAnnouncement);
      const result = await service.create(
        { title: 'Team Meeting', content: 'All hands at 3pm', scope: AnnouncementScope.GLOBAL },
        'admin-uuid',
        SystemRole.ADMIN,
      );
      expect(result.title).toBe('Team Meeting');
      expect(mockPrisma.announcement.create).toHaveBeenCalledTimes(1);
    });

    it('UTC-F055-B-002: PM can create PROJECT announcement for own project', async () => {
      mockPrisma.projectMember.findMany.mockResolvedValue([{ projectId: 'proj-uuid' }]);
      mockPrisma.announcement.create.mockResolvedValue({ ...mockAnnouncement, scope: AnnouncementScope.PROJECT, projectId: 'proj-uuid' });
      const result = await service.create(
        { title: 'Sprint Update', content: 'Sprint ends Friday', scope: AnnouncementScope.PROJECT, projectId: 'proj-uuid' },
        'pm-uuid',
        SystemRole.EMPLOYEE,
      );
      expect(result.scope).toBe(AnnouncementScope.PROJECT);
    });

    it('UTC-F055-B-003: PM cannot create GLOBAL announcement', async () => {
      mockPrisma.projectMember.findMany.mockResolvedValue([{ projectId: 'proj-uuid' }]);
      await expect(
        service.create(
          { title: 'Global Notice', content: 'For all', scope: AnnouncementScope.GLOBAL },
          'pm-uuid',
          SystemRole.EMPLOYEE,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('UTC-F055-B-004: non-PM employee cannot create announcement', async () => {
      mockPrisma.projectMember.findMany.mockResolvedValue([]);
      await expect(
        service.create(
          { title: 'Hello', content: 'World', scope: AnnouncementScope.PROJECT, projectId: 'proj-uuid' },
          'emp-uuid',
          SystemRole.EMPLOYEE,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('UTC-F055-B-005: admin sees all announcements', async () => {
      mockPrisma.announcement.findMany.mockResolvedValue([mockAnnouncement]);
      mockPrisma.announcement.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 20 }, 'admin-uuid', SystemRole.ADMIN);
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.lastPage).toBe(1);
    });

    it('UTC-F055-B-006: PM sees only GLOBAL and own project announcements', async () => {
      mockPrisma.projectMember.findMany.mockResolvedValue([{ projectId: 'proj-uuid' }]);
      mockPrisma.announcement.findMany.mockResolvedValue([mockAnnouncement]);
      mockPrisma.announcement.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 20 }, 'pm-uuid', SystemRole.EMPLOYEE);
      expect(result.data.length).toBe(1);
    });

    it('UTC-F055-B-007: non-PM employee is denied findAll', async () => {
      mockPrisma.projectMember.findMany.mockResolvedValue([]);
      await expect(
        service.findAll({ page: 1, limit: 20 }, 'emp-uuid', SystemRole.EMPLOYEE),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findLatestForWidget', () => {
    it('UTC-F055-B-008: returns up to 3 relevant announcements for any user', async () => {
      mockPrisma.projectMember.findMany.mockResolvedValue([{ projectId: 'proj-uuid' }]);
      mockPrisma.announcement.findMany.mockResolvedValue([mockAnnouncement, mockAnnouncement, mockAnnouncement]);
      const result = await service.findLatestForWidget('user-uuid');
      expect(result.data.length).toBe(3);
      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });
  });

  describe('remove', () => {
    it('UTC-F055-B-009: admin can delete any announcement', async () => {
      mockPrisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);
      mockPrisma.announcement.delete.mockResolvedValue(mockAnnouncement);
      await service.remove('ann-uuid', 'admin-uuid', SystemRole.ADMIN);
      expect(mockPrisma.announcement.delete).toHaveBeenCalledWith({ where: { id: 'ann-uuid' } });
    });

    it('UTC-F055-B-010: PM can delete own announcement', async () => {
      const ownAnn = { ...mockAnnouncement, createdById: 'pm-uuid' };
      mockPrisma.announcement.findUnique.mockResolvedValue(ownAnn);
      mockPrisma.announcement.delete.mockResolvedValue(ownAnn);
      await service.remove('ann-uuid', 'pm-uuid', SystemRole.EMPLOYEE);
      expect(mockPrisma.announcement.delete).toHaveBeenCalledTimes(1);
    });

    it('UTC-F055-B-011: PM cannot delete another user\'s announcement', async () => {
      const otherAnn = { ...mockAnnouncement, createdById: 'other-uuid' };
      mockPrisma.announcement.findUnique.mockResolvedValue(otherAnn);
      await expect(service.remove('ann-uuid', 'pm-uuid', SystemRole.EMPLOYEE)).rejects.toThrow(ForbiddenException);
    });

    it('UTC-F055-B-012: throws NotFoundException for non-existent id', async () => {
      mockPrisma.announcement.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent', 'admin-uuid', SystemRole.ADMIN)).rejects.toThrow(NotFoundException);
    });
  });
});

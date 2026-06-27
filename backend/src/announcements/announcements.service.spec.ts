import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsService } from './announcements.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  announcement: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockAnnouncement = {
  id: 'ann-uuid',
  title: 'Team Meeting',
  content: 'All hands at 3pm',
  createdAt: new Date('2026-06-26T10:00:00Z'),
  createdBy: { id: 'user-uuid', fullName: 'Yogesh Lolage', profilePhoto: null },
};

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  describe('create', () => {
    it('UTC-F054-B-001: should create and return announcement with createdBy', async () => {
      mockPrisma.announcement.create.mockResolvedValue(mockAnnouncement);
      const result = await service.create({ title: 'Team Meeting', content: 'All hands at 3pm' }, 'user-uuid');
      expect(result.title).toBe('Team Meeting');
      expect(result.createdBy.id).toBe('user-uuid');
      expect(mockPrisma.announcement.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('UTC-F054-B-002: should return paged list with total and lastPage', async () => {
      mockPrisma.announcement.findMany.mockResolvedValue([mockAnnouncement, mockAnnouncement, mockAnnouncement]);
      mockPrisma.announcement.count.mockResolvedValue(3);
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.lastPage).toBe(1);
      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('UTC-F054-B-003: latest=true should take only 3 items', async () => {
      mockPrisma.announcement.findMany.mockResolvedValue([mockAnnouncement, mockAnnouncement, mockAnnouncement]);
      const result = await service.findAll({ latest: true });
      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
      expect(result.data.length).toBe(3);
    });
  });

  describe('remove', () => {
    it('UTC-F054-B-004: should delete existing announcement', async () => {
      mockPrisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);
      mockPrisma.announcement.delete.mockResolvedValue(mockAnnouncement);
      await service.remove('ann-uuid');
      expect(mockPrisma.announcement.delete).toHaveBeenCalledWith({ where: { id: 'ann-uuid' } });
    });

    it('UTC-F054-B-005: should throw NotFoundException for non-existent id', async () => {
      mockPrisma.announcement.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

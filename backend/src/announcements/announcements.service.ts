import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

const CREATOR_SELECT = { id: true, fullName: true, profilePhoto: true };

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAnnouncementDto, createdById: string) {
    return this.prisma.announcement.create({
      data: { title: dto.title, content: dto.content, createdById },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        createdBy: { select: CREATOR_SELECT },
      },
    });
  }

  async findAll(query: { page?: number; limit?: number; latest?: boolean }) {
    const { page = 1, limit = 20, latest = false } = query;

    if (latest) {
      const data = await this.prisma.announcement.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          createdBy: { select: CREATOR_SELECT },
        },
      });
      return { data, total: data.length, page: 1, lastPage: 1 };
    }

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          createdBy: { select: CREATOR_SELECT },
        },
      }),
      this.prisma.announcement.count(),
    ]);

    return { data, total, page, lastPage: Math.ceil(total / safeLimit) || 1 };
  }

  async remove(id: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    await this.prisma.announcement.delete({ where: { id } });
  }
}

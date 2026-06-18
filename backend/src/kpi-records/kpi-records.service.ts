import { ForbiddenException, Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertKpiRecordDto {
  userId: string;
  period: string;
  metricId: string;
  points: number;
  notes?: string;
}

@Injectable()
export class KpiRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(dto: UpsertKpiRecordDto, enteredById: string, systemRole: SystemRole) {
    const isAdmin = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    if (!isAdmin && dto.userId !== enteredById) {
      const count = await this.prisma.projectMember.count({
        where: {
          userId: enteredById,
          projectRole: 'PROJECT_MANAGER',
          project: { members: { some: { userId: dto.userId } } },
        },
      });
      if (count === 0) throw new ForbiddenException('You can only enter scores for your own team members');
    }

    return this.prisma.kpiRecord.upsert({
      where: {
        userId_period_metricId: {
          userId: dto.userId,
          period: dto.period,
          metricId: dto.metricId,
        },
      },
      create: {
        userId: dto.userId,
        period: dto.period,
        metricId: dto.metricId,
        points: dto.points,
        notes: dto.notes,
        enteredById,
      },
      update: {
        points: dto.points,
        notes: dto.notes,
        enteredById,
      },
    });
  }

  findAll(userId?: string, period?: string) {
    return this.prisma.kpiRecord.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(period ? { period } : {}),
      },
      orderBy: [{ period: 'desc' }, { metricId: 'asc' }],
    });
  }
}

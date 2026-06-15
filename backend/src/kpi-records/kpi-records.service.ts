import { Injectable } from '@nestjs/common';
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

  async upsert(dto: UpsertKpiRecordDto, enteredById: string) {
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

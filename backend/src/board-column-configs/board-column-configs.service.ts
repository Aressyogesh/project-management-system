import { Injectable } from '@nestjs/common';
import { BoardStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ColumnConfigDto {
  status: BoardStatus;
  label: string;
}

@Injectable()
export class BoardColumnConfigsService {
  constructor(private prisma: PrismaService) {}

  async getByProject(projectId: string): Promise<ColumnConfigDto[]> {
    const rows = await this.prisma.boardColumnConfig.findMany({ where: { projectId } });
    return rows.map((r) => ({ status: r.status, label: r.label }));
  }

  async upsertMany(projectId: string, configs: ColumnConfigDto[]): Promise<ColumnConfigDto[]> {
    await Promise.all(
      configs.map((c) =>
        this.prisma.boardColumnConfig.upsert({
          where: { projectId_status: { projectId, status: c.status } },
          create: { projectId, status: c.status, label: c.label },
          update: { label: c.label },
        }),
      ),
    );
    return this.getByProject(projectId);
  }
}

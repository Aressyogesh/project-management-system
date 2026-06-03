import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateSprintDto, UpdateSprintDto } from './dto/sprint.dto';

@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findByProject(projectId: string) {
    const sprints = await this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    // Fetch milestoneId via raw SQL (Prisma binary client may be stale after schema migration)
    const rows: { id: string; milestoneId: string | null }[] =
      await this.prisma.$queryRaw`SELECT id, "milestoneId" FROM sprints WHERE "projectId" = ${projectId}`;
    const milestoneMap = new Map(rows.map((r) => [r.id, r.milestoneId]));
    return sprints.map((s) => ({ ...s, milestoneId: milestoneMap.get(s.id) ?? null }));
  }

  async create(projectId: string, dto: CreateSprintDto, userId: string) {
    const { milestoneId, startDate, endDate, ...rest } = dto as CreateSprintDto & { milestoneId?: string };
    const sprint = await this.prisma.sprint.create({
      data: {
        projectId,
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });
    if (milestoneId) {
      await this.prisma.$executeRaw`UPDATE sprints SET "milestoneId" = ${milestoneId} WHERE id = ${sprint.id}`;
    }

    this.auditLogs.log({
      userId,
      action: AuditAction.SPRINT_CREATED,
      entity: AuditEntity.SPRINT,
      entityId: sprint.id,
      entityTitle: sprint.name,
      projectId,
    });

    return { ...sprint, milestoneId: milestoneId ?? null };
  }

  async update(id: string, dto: UpdateSprintDto, userId: string) {
    const existing = await this.findOneOrFail(id);
    const { milestoneId, startDate, endDate, ...rest } = dto as UpdateSprintDto & { milestoneId?: string };
    const sprint = await this.prisma.sprint.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });
    if (milestoneId !== undefined) {
      await this.prisma.$executeRaw`UPDATE sprints SET "milestoneId" = ${milestoneId || null} WHERE id = ${id}`;
    }

    this.auditLogs.log({
      userId,
      action: AuditAction.SPRINT_UPDATED,
      entity: AuditEntity.SPRINT,
      entityId: sprint.id,
      entityTitle: sprint.name,
      projectId: existing.projectId,
    });

    return { ...sprint, milestoneId: milestoneId ?? null };
  }

  async setActive(id: string, projectId: string, userId: string) {
    const sprint = await this.findOneOrFail(id);
    await this.prisma.sprint.updateMany({
      where: { projectId },
      data: { isActive: false },
    });
    const result = await this.prisma.sprint.update({
      where: { id },
      data: { isActive: true },
    });

    this.auditLogs.log({
      userId,
      action: AuditAction.SPRINT_ACTIVATED,
      entity: AuditEntity.SPRINT,
      entityId: sprint.id,
      entityTitle: sprint.name,
      projectId,
    });

    return result;
  }

  async remove(id: string, userId: string) {
    const sprint = await this.findOneOrFail(id);
    const result = await this.prisma.sprint.delete({ where: { id } });

    this.auditLogs.log({
      userId,
      action: AuditAction.SPRINT_DELETED,
      entity: AuditEntity.SPRINT,
      entityId: id,
      entityTitle: sprint.name,
      projectId: sprint.projectId,
    });

    return result;
  }

  private async findOneOrFail(id: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) throw new NotFoundException(`Sprint ${id} not found`);
    return sprint;
  }
}

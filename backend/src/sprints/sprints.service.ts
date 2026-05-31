import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintDto, UpdateSprintDto } from './dto/sprint.dto';

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(projectId: string, dto: CreateSprintDto) {
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
    return { ...sprint, milestoneId: milestoneId ?? null };
  }

  async update(id: string, dto: UpdateSprintDto) {
    await this.findOneOrFail(id);
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
    return { ...sprint, milestoneId: milestoneId ?? null };
  }

  async setActive(id: string, projectId: string) {
    await this.findOneOrFail(id);
    await this.prisma.sprint.updateMany({
      where: { projectId },
      data: { isActive: false },
    });
    return this.prisma.sprint.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.sprint.delete({ where: { id } });
  }

  private async findOneOrFail(id: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) throw new NotFoundException(`Sprint ${id} not found`);
    return sprint;
  }
}

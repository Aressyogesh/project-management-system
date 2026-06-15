import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/milestone.dto';
import { UpdateMilestoneDto } from './dto/milestone.dto';

const MILESTONE_SELECT = {
  id: true,
  description: true,
  deliveryNote: true,
  startDate: true,
  dueDate: true,
  status: true,
  createdAt: true,
  responsibleUser: {
    select: { id: true, fullName: true, profilePhoto: true },
  },
} as const;

// Fetch name via raw SQL since Prisma binary client may be stale after schema migration
async function fetchNames(
  prisma: PrismaService,
  ids: string[],
): Promise<Map<string, string | null>> {
  if (!ids.length) return new Map();
  const rows: { id: string; name: string | null }[] =
    await prisma.$queryRaw`SELECT id, name FROM milestones WHERE id = ANY(${ids}::text[])`;
  return new Map(rows.map((r) => [r.id, r.name]));
}

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string) {
    await this.requireProject(projectId);
    const rows = await this.prisma.milestone.findMany({
      where: { projectId },
      select: {
        ...MILESTONE_SELECT,
        sprints: { select: { id: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    const nameMap = await fetchNames(this.prisma, rows.map((r) => r.id));

    // For each milestone, count work items (user stories / tasks / sub-tasks / bugs)
    // that live in sprints linked to that milestone
    const milestoneIds = rows.map((r) => r.id);

    // Count work items (user stories / tasks / sub-tasks / bugs) in sprints per milestone
    const perMilestone = await this.prisma.$queryRaw<
      { milestoneId: string; total: bigint; completed: bigint }[]
    >`
      SELECT s."milestoneId",
             COUNT(wi.id)                                                   AS total,
             COUNT(CASE WHEN wi.status = 'QA_DONE' THEN 1 END)             AS completed
      FROM   work_items wi
      JOIN   sprints s ON s.id = wi."sprintId"
      WHERE  s."milestoneId" = ANY(${milestoneIds}::text[])
        AND  wi.type = 'USER_STORY'
      GROUP  BY s."milestoneId"
    `;

    const statsMap = new Map(
      perMilestone.map((r) => [
        r.milestoneId,
        { total: Number(r.total), completed: Number(r.completed) },
      ]),
    );

    return rows.map(({ sprints: _sprints, ...ms }) => {
      const s = statsMap.get(ms.id) ?? { total: 0, completed: 0 };
      return {
        ...ms,
        name: nameMap.get(ms.id) ?? null,
        totalTasks: s.total,
        completedTasks: s.completed,
        progressPercent: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
      };
    });
  }

  async create(projectId: string, dto: CreateMilestoneDto) {
    await this.requireProject(projectId);
    this.validateDates(dto.startDate, dto.dueDate);

    const ms = await this.prisma.milestone.create({
      data: {
        projectId,
        description: dto.description.trim(),
        deliveryNote: dto.deliveryNote?.trim() || undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        responsibleUserId: dto.responsibleUserId || undefined,
        status: dto.status ?? 'NOT_STARTED',
      },
      select: MILESTONE_SELECT,
    });

    const name = dto.name?.trim() || null;
    if (name !== null) {
      await this.prisma.$executeRaw`UPDATE milestones SET name = ${name} WHERE id = ${ms.id}`;
    }
    return { ...ms, name };
  }

  async update(id: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const startDate = dto.startDate ?? milestone.startDate?.toISOString().split('T')[0];
    const dueDate = dto.dueDate ?? milestone.dueDate?.toISOString().split('T')[0];
    this.validateDates(startDate, dueDate);

    const ms = await this.prisma.milestone.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.deliveryNote !== undefined && { deliveryNote: dto.deliveryNote.trim() || null }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.responsibleUserId !== undefined && { responsibleUserId: dto.responsibleUserId || null }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      select: MILESTONE_SELECT,
    });

    let name: string | null = null;
    if (dto.name !== undefined) {
      name = dto.name?.trim() || null;
      await this.prisma.$executeRaw`UPDATE milestones SET name = ${name} WHERE id = ${id}`;
    } else {
      const nameMap = await fetchNames(this.prisma, [id]);
      name = nameMap.get(id) ?? null;
    }
    return { ...ms, name };
  }

  async remove(id: string) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const linked = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM sprints WHERE "milestoneId" = ${id}
    `;
    if (Number(linked[0].count) > 0) {
      throw new BadRequestException(
        'This milestone has associated sprints. Reassign or remove those sprints before deleting.',
      );
    }

    await this.prisma.milestone.delete({ where: { id } });
  }

  private validateDates(startDate?: string | null, dueDate?: string | null) {
    if (startDate && dueDate && dueDate < startDate) {
      throw new BadRequestException('Due date must be on or after start date');
    }
  }

  private async requireProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
  }
}

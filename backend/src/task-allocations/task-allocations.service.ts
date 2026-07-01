import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTaskAllocationDto,
  UpdateTaskAllocationDto,
} from './dto/task-allocation.dto';

const DAILY_CAP = 8;

const ALLOCATION_SELECT = {
  id: true,
  date: true,
  allocatedHours: true,
  task: {
    select: { id: true, title: true, projectId: true },
  },
  user: {
    select: { id: true, fullName: true, profilePhoto: true },
  },
} as const;

@Injectable()
export class TaskAllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskAllocationDto) {
    const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.assertCap(dto.userId, dto.date, dto.allocatedHours, null);

    try {
      return await this.prisma.taskAllocation.create({
        data: {
          taskId: dto.taskId,
          userId: dto.userId,
          date: new Date(dto.date),
          allocatedHours: dto.allocatedHours,
        },
        select: ALLOCATION_SELECT,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Allocation already exists for this task, user, and date');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateTaskAllocationDto) {
    const existing = await this.prisma.taskAllocation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Allocation not found');

    await this.assertCap(
      existing.userId,
      existing.date.toISOString().split('T')[0],
      dto.allocatedHours,
      id,
    );

    return this.prisma.taskAllocation.update({
      where: { id },
      data: { allocatedHours: dto.allocatedHours },
      select: ALLOCATION_SELECT,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.taskAllocation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Allocation not found');
    await this.prisma.taskAllocation.delete({ where: { id } });
  }

  async findByProject(projectId: string) {
    return this.prisma.taskAllocation.findMany({
      where: { task: { projectId } },
      select: ALLOCATION_SELECT,
      orderBy: [{ date: 'asc' }],
    });
  }

  async findByUser(userId: string, from?: string, to?: string) {
    return this.prisma.taskAllocation.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      select: ALLOCATION_SELECT,
      orderBy: [{ date: 'asc' }],
    });
  }

  async check(userId: string, date: string) {
    const agg = await this.prisma.taskAllocation.aggregate({
      where: { userId, date: new Date(date) },
      _sum: { allocatedHours: true },
    });
    const allocated = agg._sum.allocatedHours ?? 0;
    return { allocatedHours: allocated, remainingHours: Math.max(0, DAILY_CAP - allocated) };
  }

  private async assertCap(
    userId: string,
    date: string,
    newHours: number,
    excludeId: string | null,
  ) {
    const agg = await this.prisma.taskAllocation.aggregate({
      where: {
        userId,
        date: new Date(date),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      _sum: { allocatedHours: true },
    });
    const existing = agg._sum.allocatedHours ?? 0;
    if (existing + newHours > DAILY_CAP) {
      const remaining = Math.max(0, DAILY_CAP - existing);
      throw new UnprocessableEntityException(
        `Over-allocation: user already has ${existing}h allocated on ${date}. Only ${remaining}h remaining.`,
      );
    }
  }
}

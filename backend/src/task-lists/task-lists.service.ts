import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskListType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskListDto, UpdateTaskListDto } from './dto/task-list.dto';

const TASK_LIST_SELECT = {
  id: true,
  name: true,
  type: true,
  sprintNumber: true,
  description: true,
  createdAt: true,
};

@Injectable()
export class TaskListsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string) {
    await this.requireProject(projectId);
    return this.prisma.taskList.findMany({
      where: { projectId },
      select: TASK_LIST_SELECT,
      orderBy: [{ type: 'asc' }, { sprintNumber: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(projectId: string, dto: CreateTaskListDto) {
    await this.requireProject(projectId);
    this.validateSprintNumber(dto.type, dto.sprintNumber);
    return this.prisma.taskList.create({
      data: {
        projectId,
        name: dto.name.trim(),
        type: dto.type,
        sprintNumber: dto.type === TaskListType.SPRINT ? dto.sprintNumber : null,
        description: dto.description?.trim() || null,
      },
      select: TASK_LIST_SELECT,
    });
  }

  async update(id: string, dto: UpdateTaskListDto) {
    const existing = await this.prisma.taskList.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task list not found');

    const resolvedType = dto.type ?? existing.type;
    const resolvedSprintNumber =
      dto.sprintNumber !== undefined ? dto.sprintNumber : existing.sprintNumber;
    this.validateSprintNumber(resolvedType, resolvedSprintNumber ?? undefined);

    return this.prisma.taskList.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.type !== undefined && {
          sprintNumber:
            dto.type === TaskListType.SPRINT ? (dto.sprintNumber ?? existing.sprintNumber) : null,
        }),
        ...(dto.sprintNumber !== undefined &&
          resolvedType === TaskListType.SPRINT && { sprintNumber: dto.sprintNumber }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
      },
      select: TASK_LIST_SELECT,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.taskList.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task list not found');
    await this.prisma.taskList.delete({ where: { id } });
  }

  private async requireProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  private validateSprintNumber(type: TaskListType, sprintNumber?: number) {
    if (type === TaskListType.SPRINT && !sprintNumber) {
      throw new BadRequestException(
        'sprintNumber is required when type is SPRINT',
      );
    }
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntity } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  priority: true,
  billingStatus: true,
  status: true,
  estimatedHours: true,
  startDate: true,
  dueDate: true,
  createdAt: true,
  taskList: { select: { id: true, name: true, type: true } },
  milestone: { select: { id: true, description: true } },
  assignedTo: { select: { id: true, fullName: true, profilePhoto: true } },
  createdBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findAll(projectId: string) {
    await this.requireProject(projectId);
    return this.prisma.task.findMany({
      where: { projectId },
      select: TASK_SELECT,
      orderBy: [{ taskListId: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: TASK_SELECT,
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(projectId: string, dto: CreateTaskDto, createdById: string) {
    await this.requireProject(projectId);
    await this.requireTaskList(dto.taskListId, projectId);
    if (dto.milestoneId) await this.requireMilestone(dto.milestoneId, projectId);

    const task = await this.prisma.task.create({
      data: {
        projectId,
        taskListId: dto.taskListId,
        milestoneId: dto.milestoneId ?? null,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        assignedToId: dto.assignedToId ?? null,
        createdById,
        estimatedHours: dto.estimatedHours ?? null,
        priority: dto.priority ?? 'MEDIUM',
        billingStatus: dto.billingStatus ?? 'BILLABLE',
        status: dto.status ?? 'NOT_STARTED',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      select: TASK_SELECT,
    });
    this.auditLogs.log({
      userId: createdById,
      action: AuditAction.TASK_CREATED,
      entity: AuditEntity.TASK,
      entityId: task.id,
      entityTitle: task.title,
      projectId,
    });
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, actorId?: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    if (dto.taskListId && dto.taskListId !== existing.taskListId) {
      await this.requireTaskList(dto.taskListId, existing.projectId);
    }
    if (dto.milestoneId && dto.milestoneId !== existing.milestoneId) {
      await this.requireMilestone(dto.milestoneId, existing.projectId);
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.taskListId !== undefined && { taskListId: dto.taskListId }),
        ...(dto.milestoneId !== undefined && { milestoneId: dto.milestoneId || null }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId || null }),
        ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.billingStatus !== undefined && { billingStatus: dto.billingStatus }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
      },
      select: TASK_SELECT,
    });
    if (actorId) {
      this.auditLogs.log({
        userId: actorId,
        action: AuditAction.TASK_UPDATED,
        entity: AuditEntity.TASK,
        entityId: id,
        entityTitle: updated.title,
        projectId: existing.projectId,
      });
    }
    return updated;
  }

  async remove(id: string, actorId?: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    await this.prisma.task.delete({ where: { id } });
    if (actorId) {
      this.auditLogs.log({
        userId: actorId,
        action: AuditAction.TASK_DELETED,
        entity: AuditEntity.TASK,
        entityId: id,
        entityTitle: existing.title,
        projectId: existing.projectId,
      });
    }
  }

  private async requireProject(projectId: string) {
    const p = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException('Project not found');
  }

  private async requireTaskList(taskListId: string, projectId: string) {
    const tl = await this.prisma.taskList.findUnique({ where: { id: taskListId } });
    if (!tl || tl.projectId !== projectId) {
      throw new BadRequestException('Task list not found in this project');
    }
  }

  private async requireMilestone(milestoneId: string, projectId: string) {
    const ms = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!ms || ms.projectId !== projectId) {
      throw new BadRequestException('Milestone not found in this project');
    }
  }
}

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

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string) {
    await this.requireProject(projectId);
    return this.prisma.milestone.findMany({
      where: { projectId },
      select: MILESTONE_SELECT,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(projectId: string, dto: CreateMilestoneDto) {
    await this.requireProject(projectId);
    this.validateDates(dto.startDate, dto.dueDate);

    return this.prisma.milestone.create({
      data: {
        projectId,
        description: dto.description.trim(),
        deliveryNote: dto.deliveryNote?.trim() || undefined,
        startDate: dto.startDate || undefined,
        dueDate: dto.dueDate || undefined,
        responsibleUserId: dto.responsibleUserId || undefined,
        status: dto.status ?? 'NOT_STARTED',
      },
      select: MILESTONE_SELECT,
    });
  }

  async update(id: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const startDate = dto.startDate ?? milestone.startDate?.toISOString().split('T')[0];
    const dueDate = dto.dueDate ?? milestone.dueDate?.toISOString().split('T')[0];
    this.validateDates(startDate, dueDate);

    return this.prisma.milestone.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.deliveryNote !== undefined && { deliveryNote: dto.deliveryNote.trim() || null }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate || null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate || null }),
        ...(dto.responsibleUserId !== undefined && { responsibleUserId: dto.responsibleUserId || null }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      select: MILESTONE_SELECT,
    });
  }

  async remove(id: string) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException('Milestone not found');
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

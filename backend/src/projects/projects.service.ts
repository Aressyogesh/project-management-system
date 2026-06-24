import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntity, ProjectStatus, SystemRole } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, ProjectsQueryDto, UpdateProjectDto } from './dto/project.dto';

const PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  startDate: true,
  endDate: true,
  budget: true,
  projectType: true,
  status: true,
  createdAt: true,
  client: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
};

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  findAll(query: ProjectsQueryDto = {}, userId?: string, systemRole?: SystemRole) {
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    return this.prisma.project.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { projectType: query.type } : {}),
        ...(!isAdmin && userId ? { members: { some: { userId } } } : {}),
      },
      select: PROJECT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: PROJECT_SELECT });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async getSummary(userId?: string, systemRole?: SystemRole) {
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    const projects = await this.prisma.project.findMany({
      where: !isAdmin && userId ? { members: { some: { userId } } } : undefined,
      select: { status: true, projectType: true, endDate: true },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      active:    projects.filter((p) => p.status === 'ACTIVE').length,
      archive:   projects.filter((p) => p.status === 'ARCHIVE').length,
      onHold:    projects.filter((p) => p.status === 'ON_HOLD').length,
      dedicated: projects.filter((p) => p.projectType === 'DEDICATED').length,
      tAndM:     projects.filter((p) => p.projectType === 'T_AND_M').length,
      fixed:     projects.filter((p) => p.projectType === 'FIXED').length,
      overdue:   projects.filter((p) => p.status === 'ACTIVE' && p.endDate !== null && new Date(p.endDate) < today).length,
    };
  }

  async create(dto: CreateProjectDto, actorId?: string) {
    this.validateDates(dto.startDate, dto.endDate);
    const project = await this.prisma.project.create({
      data: {
        name: dto.name.trim(),
        projectType: dto.projectType,
        clientId: dto.clientId ?? null,
        departmentId: dto.departmentId ?? null,
        description: dto.description?.trim() ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget ?? null,
      },
      select: PROJECT_SELECT,
    });
    if (actorId) {
      this.auditLogs.log({
        userId: actorId,
        action: AuditAction.PROJECT_CREATED,
        entity: AuditEntity.PROJECT,
        entityId: project.id,
        entityTitle: project.name,
        projectId: project.id,
      });
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, actorId?: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const startDate = dto.startDate !== undefined ? dto.startDate : project.startDate?.toISOString().split('T')[0];
    const endDate = dto.endDate !== undefined ? dto.endDate : project.endDate?.toISOString().split('T')[0];
    this.validateDates(startDate, endDate);

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.projectType !== undefined ? { projectType: dto.projectType } : {}),
        ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() ?? null } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
        ...(dto.budget !== undefined ? { budget: dto.budget } : {}),
      },
      select: PROJECT_SELECT,
    });
    if (actorId) {
      this.auditLogs.log({
        userId: actorId,
        action: AuditAction.PROJECT_UPDATED,
        entity: AuditEntity.PROJECT,
        entityId: id,
        entityTitle: updated.name,
        projectId: id,
      });
    }
    return updated;
  }

  async setStatus(id: string, status: ProjectStatus, actorId?: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    const updated = await this.prisma.project.update({ where: { id }, data: { status }, select: PROJECT_SELECT });
    if (actorId) {
      this.auditLogs.log({
        userId: actorId,
        action: AuditAction.PROJECT_STATUS_CHANGED,
        entity: AuditEntity.PROJECT,
        entityId: id,
        entityTitle: project.name,
        projectId: id,
        metadata: { from: project.status, to: status },
      });
    }
    return updated;
  }

  async delete(id: string, actorId?: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== ProjectStatus.ARCHIVE) {
      throw new BadRequestException('Only archived projects can be deleted. Archive the project first.');
    }
    await this.prisma.project.delete({ where: { id } });
    if (actorId) {
      this.auditLogs.log({
        userId: actorId,
        action: AuditAction.PROJECT_DELETED,
        entity: AuditEntity.PROJECT,
        entityId: id,
        entityTitle: project.name,
      });
    }
  }

  private validateDates(startDate?: string, endDate?: string) {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('End date must be on or after start date');
    }
  }
}

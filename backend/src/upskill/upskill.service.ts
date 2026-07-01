import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntity, ProjectRole, SystemRole, UpskillStatus, UpskillType } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAssignmentDto {
  type: UpskillType;
  assignedToId: string;
  description: string;
  toolScript?: string;
  startDate: string;
  endDate: string;
}

export interface LogProgressDto {
  percentComplete: number;
  hoursSpent: number;
  notes?: string;
}

@Injectable()
export class UpskillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async isManager(userId: string, systemRole: SystemRole): Promise<boolean> {
    if (systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER) return true;
    const pm = await this.prisma.projectMember.findFirst({
      where: { userId, projectRole: ProjectRole.PROJECT_MANAGER },
    });
    return !!pm;
  }

  async assignableUsers(callerId: string, systemRole: SystemRole) {
    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    if (isPrivileged) {
      return this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, systemRole: true, department: { select: { name: true } } },
        orderBy: { fullName: 'asc' },
      });
    }

    // For PM: return members of projects they manage
    const managedProjects = await this.prisma.projectMember.findMany({
      where: { userId: callerId, projectRole: ProjectRole.PROJECT_MANAGER },
      select: { projectId: true },
    });
    const projectIds = managedProjects.map((p) => p.projectId);
    if (projectIds.length === 0) return [];

    const members = await this.prisma.projectMember.findMany({
      where: { projectId: { in: projectIds } },
      select: { user: { select: { id: true, fullName: true, systemRole: true, department: { select: { name: true } } } } },
      distinct: ['userId'],
    });
    return members
      .map((m) => m.user)
      .filter((u) => u !== null)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  private async isManagedMember(callerId: string, targetUserId: string): Promise<boolean> {
    const managedProjects = await this.prisma.projectMember.findMany({
      where: { userId: callerId, projectRole: ProjectRole.PROJECT_MANAGER },
      select: { projectId: true },
    });
    if (managedProjects.length === 0) return false;
    const projectIds = managedProjects.map((p) => p.projectId);
    const membership = await this.prisma.projectMember.findFirst({
      where: { userId: targetUserId, projectId: { in: projectIds } },
    });
    return !!membership;
  }

  async createAssignment(callerId: string, dto: CreateAssignmentDto) {
    const { type, assignedToId, description, toolScript, startDate, endDate } = dto;

    if (type === UpskillType.AUTOMATION && !toolScript?.trim()) {
      throw new BadRequestException('toolScript is required for AUTOMATION type');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const target = await this.prisma.user.findUnique({ where: { id: assignedToId }, select: { id: true } });
    if (!target) throw new NotFoundException('Assigned user not found');

    const conflict = await this.prisma.upskillAssignment.findFirst({
      where: { assignedToId, startDate: { lte: end }, endDate: { gte: start } },
      select: { startDate: true, endDate: true },
    });
    if (conflict) {
      throw new ConflictException(
        `This resource already has an upskill assignment from ${conflict.startDate.toISOString().split('T')[0]} to ${conflict.endDate.toISOString().split('T')[0]}. Date ranges cannot overlap.`,
      );
    }

    const created = await this.prisma.upskillAssignment.create({
      data: {
        type,
        assignedToId,
        createdById: callerId,
        description,
        toolScript: toolScript ?? null,
        startDate: start,
        endDate: end,
      },
      include: { assignedTo: { select: { id: true, fullName: true } }, createdBy: { select: { id: true, fullName: true } } },
    });
    this.auditLogs.log({
      userId: callerId,
      action: AuditAction.UPSKILL_ASSIGNED,
      entity: AuditEntity.UPSKILL_ASSIGNMENT,
      entityId: created.id,
      entityTitle: `${type} — ${created.assignedTo?.fullName ?? assignedToId}`,
      metadata: { type, startDate: startDate.slice(0, 10), endDate: endDate.slice(0, 10) },
    });
    return created;
  }

  async updateAssignment(
    assignmentId: string,
    callerId: string,
    systemRole: SystemRole,
    dto: Partial<Omit<CreateAssignmentDto, 'type'>>,
  ) {
    const assignment = await this.prisma.upskillAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.status !== UpskillStatus.ASSIGNED) {
      throw new ConflictException('Only assignments that have not started can be edited');
    }
    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    if (!isPrivileged) {
      const canManage = assignment.createdById === callerId ||
        await this.isManagedMember(callerId, assignment.assignedToId);
      if (!canManage) throw new ForbiddenException('You can only edit assignments for your project members');
    }

    const start = dto.startDate ? new Date(dto.startDate) : assignment.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : assignment.endDate;
    if (end <= start) throw new BadRequestException('endDate must be after startDate');

    if (assignment.type === UpskillType.AUTOMATION && dto.toolScript !== undefined && !dto.toolScript?.trim()) {
      throw new BadRequestException('toolScript is required for AUTOMATION type');
    }

    const assignedToId = dto.assignedToId ?? assignment.assignedToId;
    const conflict = await this.prisma.upskillAssignment.findFirst({
      where: { assignedToId, startDate: { lte: end }, endDate: { gte: start }, id: { not: assignmentId } },
      select: { startDate: true, endDate: true },
    });
    if (conflict) {
      throw new ConflictException(
        `This resource already has an upskill assignment from ${conflict.startDate.toISOString().split('T')[0]} to ${conflict.endDate.toISOString().split('T')[0]}. Date ranges cannot overlap.`,
      );
    }

    const updated = await this.prisma.upskillAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(dto.assignedToId ? { assignedToId: dto.assignedToId } : {}),
        ...(dto.description ? { description: dto.description } : {}),
        ...(dto.toolScript !== undefined ? { toolScript: dto.toolScript || null } : {}),
        startDate: start,
        endDate: end,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    this.auditLogs.log({
      userId: callerId,
      action: AuditAction.UPSKILL_UPDATED,
      entity: AuditEntity.UPSKILL_ASSIGNMENT,
      entityId: assignmentId,
      entityTitle: `${updated.type} — ${updated.assignedTo?.fullName ?? assignmentId}`,
    });
    return updated;
  }

  async deleteAssignment(assignmentId: string, callerId: string, systemRole: SystemRole) {
    const assignment = await this.prisma.upskillAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.status !== UpskillStatus.ASSIGNED) {
      throw new ConflictException('Only assignments that have not started can be deleted');
    }
    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    if (!isPrivileged) {
      const canManage = assignment.createdById === callerId ||
        await this.isManagedMember(callerId, assignment.assignedToId);
      if (!canManage) throw new ForbiddenException('You can only delete assignments for your project members');
    }
    await this.prisma.upskillAssignment.delete({ where: { id: assignmentId } });
    this.auditLogs.log({
      userId: callerId,
      action: AuditAction.UPSKILL_DELETED,
      entity: AuditEntity.UPSKILL_ASSIGNMENT,
      entityId: assignmentId,
      entityTitle: `${assignment.type} assignment`,
    });
  }

  private buildPeriodFilter(period: string) {
    const [year, month] = period.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { startDate: { lte: end }, endDate: { gte: start } };
  }

  async findAll(
    callerId: string,
    systemRole: SystemRole,
    options: { mine?: boolean; status?: UpskillStatus; assignedToId?: string; period?: string; page?: number; limit?: number },
  ) {
    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 10));
    const skip = (page - 1) * limit;

    const include = {
      assignedTo: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
      progressLogs: { orderBy: { createdAt: 'desc' as const } },
    };

    if (options.mine) {
      const periodFilter = options.period ? this.buildPeriodFilter(options.period) : {};
      const where = {
        assignedToId: callerId,
        ...(options.status ? { status: options.status } : {}),
        ...periodFilter,
      };
      const [data, total] = await this.prisma.$transaction([
        this.prisma.upskillAssignment.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take: limit }),
        this.prisma.upskillAssignment.count({ where }),
      ]);
      return { data, total, page, limit };
    }

    let assignedToIdFilter: string[] | undefined;
    if (!isPrivileged) {
      const managedProjects = await this.prisma.projectMember.findMany({
        where: { userId: callerId, projectRole: ProjectRole.PROJECT_MANAGER },
        select: { projectId: true },
      });
      const projectIds = managedProjects.map((p) => p.projectId);
      if (projectIds.length === 0) return { data: [], total: 0, page, limit };

      const members = await this.prisma.projectMember.findMany({
        where: { projectId: { in: projectIds } },
        select: { userId: true },
        distinct: ['userId'],
      });
      assignedToIdFilter = members.map((m) => m.userId);
    }

    const assignedToWhere = options.assignedToId
      ? { assignedToId: options.assignedToId }
      : assignedToIdFilter
        ? { assignedToId: { in: assignedToIdFilter } }
        : {};

    const where = {
      ...assignedToWhere,
      ...(options.status ? { status: options.status } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.upskillAssignment.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.upskillAssignment.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string, callerId: string, systemRole: SystemRole) {
    const assignment = await this.prisma.upskillAssignment.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        progressLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    const isOwner = assignment.assignedToId === callerId;
    const isCreator = assignment.createdById === callerId;
    if (!isPrivileged && !isOwner && !isCreator) {
      throw new ForbiddenException('Access denied');
    }

    return assignment;
  }

  async logProgress(assignmentId: string, callerId: string, dto: LogProgressDto) {
    const assignment = await this.prisma.upskillAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.assignedToId !== callerId) throw new ForbiddenException('Only the assigned resource can log progress');
    if (assignment.status === UpskillStatus.APPROVED) {
      throw new ConflictException('Cannot log progress on an APPROVED assignment');
    }
    if (assignment.status === UpskillStatus.SUBMITTED) {
      throw new ConflictException('Cannot log progress on a SUBMITTED assignment — awaiting manager review');
    }

    if (dto.percentComplete < 0 || dto.percentComplete > 100) {
      throw new BadRequestException('percentComplete must be between 0 and 100');
    }
    if (dto.hoursSpent <= 0) {
      throw new BadRequestException('hoursSpent must be greater than 0');
    }

    const [log] = await this.prisma.$transaction([
      this.prisma.upskillProgressLog.create({
        data: { assignmentId, userId: callerId, percentComplete: dto.percentComplete, hoursSpent: dto.hoursSpent, notes: dto.notes },
      }),
      ...(assignment.status === UpskillStatus.ASSIGNED
        ? [this.prisma.upskillAssignment.update({ where: { id: assignmentId }, data: { status: UpskillStatus.IN_PROGRESS } })]
        : []),
    ]);
    this.auditLogs.log({
      userId: callerId,
      action: AuditAction.UPSKILL_PROGRESS_LOGGED,
      entity: AuditEntity.UPSKILL_ASSIGNMENT,
      entityId: assignmentId,
      metadata: { percentComplete: dto.percentComplete, hoursSpent: dto.hoursSpent },
    });
    return log;
  }

  async submitEvidence(assignmentId: string, callerId: string, filePath: string, fileName: string) {
    const assignment = await this.prisma.upskillAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.assignedToId !== callerId) throw new ForbiddenException('Only the assigned resource can submit evidence');

    if (assignment.status === UpskillStatus.SUBMITTED || assignment.status === UpskillStatus.APPROVED) {
      throw new ConflictException(`Cannot submit on a ${assignment.status} assignment`);
    }

    if (assignment.status === UpskillStatus.REJECTED) {
      const now = new Date();
      const endMonth = new Date(assignment.endDate.getFullYear(), assignment.endDate.getMonth() + 1, 1);
      if (now >= endMonth) {
        throw new ForbiddenException('Resubmission window has closed for this assignment');
      }
    }

    const submitted = await this.prisma.upskillAssignment.update({
      where: { id: assignmentId },
      data: { status: UpskillStatus.SUBMITTED, evidenceFilePath: filePath, evidenceFileName: fileName, rejectionReason: null },
    });
    this.auditLogs.log({
      userId: callerId,
      action: AuditAction.UPSKILL_SUBMITTED,
      entity: AuditEntity.UPSKILL_ASSIGNMENT,
      entityId: assignmentId,
      entityTitle: `${submitted.type ?? 'Upskill'} assignment submitted`,
    });
    return submitted;
  }

  async approveAssignment(assignmentId: string, approverId: string, systemRole: SystemRole) {
    const assignment = await this.prisma.upskillAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.status !== UpskillStatus.SUBMITTED) {
      throw new ConflictException('Assignment must be in SUBMITTED state to approve');
    }

    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    if (!isPrivileged) {
      const canManage = assignment.createdById === approverId ||
        await this.isManagedMember(approverId, assignment.assignedToId);
      if (!canManage) throw new ForbiddenException('You can only approve assignments for your project members');
    }

    const approved = await this.prisma.upskillAssignment.update({
      where: { id: assignmentId },
      data: { status: UpskillStatus.APPROVED, approvedById: approverId, approvedAt: new Date() },
    });
    this.auditLogs.log({
      userId: approverId,
      action: AuditAction.UPSKILL_APPROVED,
      entity: AuditEntity.UPSKILL_ASSIGNMENT,
      entityId: assignmentId,
      entityTitle: `${approved.type ?? 'Upskill'} assignment approved`,
      metadata: { assignedToId: approved.assignedToId },
    });
    return approved;
  }

  async rejectAssignment(assignmentId: string, rejectorId: string, reason: string, systemRole: SystemRole) {
    if (!reason?.trim()) throw new BadRequestException('reason is required to reject an assignment');

    const assignment = await this.prisma.upskillAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.status !== UpskillStatus.SUBMITTED) {
      throw new ConflictException('Assignment must be in SUBMITTED state to reject');
    }

    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    if (!isPrivileged) {
      const canManage = assignment.createdById === rejectorId ||
        await this.isManagedMember(rejectorId, assignment.assignedToId);
      if (!canManage) throw new ForbiddenException('You can only reject assignments for your project members');
    }

    const rejected = await this.prisma.upskillAssignment.update({
      where: { id: assignmentId },
      data: { status: UpskillStatus.REJECTED, rejectionReason: reason.trim() },
    });
    this.auditLogs.log({
      userId: rejectorId,
      action: AuditAction.UPSKILL_REJECTED,
      entity: AuditEntity.UPSKILL_ASSIGNMENT,
      entityId: assignmentId,
      entityTitle: `${rejected.type ?? 'Upskill'} assignment rejected`,
      metadata: { assignedToId: rejected.assignedToId, reason: reason.trim() },
    });
    return rejected;
  }

  async getEvidence(assignmentId: string, callerId: string, systemRole: SystemRole) {
    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    const assignment = await this.prisma.upskillAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const isOwner = assignment.assignedToId === callerId;
    const isCreator = assignment.createdById === callerId;
    if (!isPrivileged && !isOwner && !isCreator) throw new ForbiddenException('Access denied');
    if (!assignment.evidenceFilePath) throw new NotFoundException('No evidence file found');

    return { filePath: assignment.evidenceFilePath, fileName: assignment.evidenceFileName ?? 'evidence' };
  }

  // Used by analytics service to check approved upskill in a period
  findApprovedForUserInPeriod(userId: string, periodStart: Date, periodEnd: Date) {
    return this.prisma.upskillAssignment.findFirst({
      where: {
        assignedToId: userId,
        status: UpskillStatus.APPROVED,
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      select: { id: true },
    });
  }
}

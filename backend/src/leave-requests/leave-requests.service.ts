import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntity, LeaveStatus, ProjectRole, SystemRole } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveLeaveRequestDto, CreateLeaveRequestDto, RejectLeaveRequestDto } from './dto/leave-request.dto';

const LEAVE_INCLUDE = {
  user: { select: { id: true, fullName: true, profilePhoto: true } },
  approvedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(requestingUserId: string, systemRole: SystemRole, dto: CreateLeaveRequestDto) {
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;

    // Only admins and project managers can record leaves
    if (!isAdmin) {
      const isPm = await this.isUserAPm(requestingUserId);
      if (!isPm) throw new ForbiddenException('Only admins and project managers can record leaves');
    }

    if (!dto.targetUserId) throw new BadRequestException('targetUserId is required');
    const targetUserId = dto.targetUserId;

    if (!isAdmin) {
      await this.assertCanManage(requestingUserId, systemRole, targetUserId);
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end < start) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    if (dto.isHalfDay && dto.startDate !== dto.endDate) {
      throw new BadRequestException('Half-day leave must have the same start and end date');
    }

    const fullDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = dto.isHalfDay ? 0.5 : fullDays;

    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        userId: targetUserId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlap) {
      throw new ConflictException(
        `Overlapping leave already exists (${overlap.startDate.toISOString().slice(0, 10)} — ${overlap.endDate.toISOString().slice(0, 10)})`,
      );
    }

    const leave = await this.prisma.leaveRequest.create({
      data: {
        userId: targetUserId,
        type: dto.type,
        startDate: start,
        endDate: end,
        totalDays,
        isHalfDay: dto.isHalfDay ?? false,
        isPlanned: dto.isPlanned ?? true,
        reason: dto.reason ?? null,
        status: LeaveStatus.APPROVED,
        approvedById: requestingUserId,
        approvedAt: new Date(),
      },
      include: LEAVE_INCLUDE,
    });
    this.auditLogs.log({
      userId: requestingUserId,
      action: AuditAction.LEAVE_REQUESTED,
      entity: AuditEntity.LEAVE_REQUEST,
      entityId: leave.id,
      entityTitle: `${dto.type} leave (${dto.startDate} — ${dto.endDate})`,
      metadata: { type: dto.type, totalDays, isHalfDay: dto.isHalfDay ?? false, isPlanned: dto.isPlanned ?? true, recordedFor: targetUserId },
    });
    return leave;
  }

  async getManageableMembers(requestingUserId: string, systemRole: SystemRole): Promise<{ id: string; fullName: string }[]> {
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;

    if (isAdmin) {
      return this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      });
    }

    const teamMemberIds = await this.getPmTeamMemberIds(requestingUserId);
    if (teamMemberIds.length === 0) return [];

    return this.prisma.user.findMany({
      where: { id: { in: [requestingUserId, ...teamMemberIds] }, isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async findAll(
    requestingUserId: string,
    systemRole: SystemRole,
    query: { status?: LeaveStatus; userId?: string },
  ) {
    const isAdmin =
      systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;

    const where: Record<string, unknown> = {};

    if (isAdmin) {
      if (query.userId) where['userId'] = query.userId;
    } else {
      const teamMemberIds = await this.getPmTeamMemberIds(requestingUserId);
      if (teamMemberIds.length > 0) {
        where['userId'] = { in: [requestingUserId, ...teamMemberIds] };
      } else {
        where['userId'] = requestingUserId;
      }
    }

    if (query.status) where['status'] = query.status;

    return this.prisma.leaveRequest.findMany({
      where,
      include: LEAVE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requestingUserId: string, systemRole: SystemRole) {
    const leave = await this.findOneOrFail(id);
    const isAdmin =
      systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    if (!isAdmin && leave.userId !== requestingUserId) {
      throw new ForbiddenException('Access denied');
    }
    return leave;
  }

  async approve(
    id: string,
    approverId: string,
    systemRole: SystemRole,
    dto: ApproveLeaveRequestDto,
  ) {
    const leave = await this.findOneOrFail(id);
    await this.assertCanManage(approverId, systemRole, leave.userId);
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only PENDING leave requests can be approved');
    }
    const approved = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
        approvalNote: dto.approvalNote ?? null,
      },
      include: LEAVE_INCLUDE,
    });
    this.auditLogs.log({
      userId: approverId,
      action: AuditAction.LEAVE_APPROVED,
      entity: AuditEntity.LEAVE_REQUEST,
      entityId: id,
      entityTitle: `${approved.user.fullName} — ${approved.type} leave`,
      metadata: { forUserId: approved.user.id },
    });
    return approved;
  }

  async reject(
    id: string,
    approverId: string,
    systemRole: SystemRole,
    dto: RejectLeaveRequestDto,
  ) {
    const leave = await this.findOneOrFail(id);
    await this.assertCanManage(approverId, systemRole, leave.userId);
    if (leave.status === LeaveStatus.CANCELLED) {
      throw new BadRequestException('Cannot reject a cancelled leave request');
    }
    const rejected = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        approvedById: approverId,
        approvedAt: new Date(),
        approvalNote: dto.approvalNote ?? null,
      },
      include: LEAVE_INCLUDE,
    });
    this.auditLogs.log({
      userId: approverId,
      action: AuditAction.LEAVE_REJECTED,
      entity: AuditEntity.LEAVE_REQUEST,
      entityId: id,
      entityTitle: `${rejected.user.fullName} — ${rejected.type} leave`,
      metadata: { forUserId: rejected.user.id },
    });
    return rejected;
  }

  async cancel(id: string, requestingUserId: string, systemRole: SystemRole) {
    const leave = await this.findOneOrFail(id);
    const isAdmin =
      systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;

    if (!isAdmin && leave.userId !== requestingUserId) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    if (!isAdmin && leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('You can only cancel PENDING leave requests');
    }

    const cancelled = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
      include: LEAVE_INCLUDE,
    });
    this.auditLogs.log({
      userId: requestingUserId,
      action: AuditAction.LEAVE_CANCELLED,
      entity: AuditEntity.LEAVE_REQUEST,
      entityId: id,
      entityTitle: `${cancelled.type} leave cancelled`,
    });
    return cancelled;
  }

  private async isUserAPm(userId: string): Promise<boolean> {
    const count = await this.prisma.projectMember.count({
      where: { userId, projectRole: ProjectRole.PROJECT_MANAGER },
    });
    return count > 0;
  }

  private async assertCanManage(actorId: string, systemRole: SystemRole, targetUserId: string) {
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    if (isAdmin) return;
    const isPm = await this.isPmForUser(actorId, targetUserId);
    if (!isPm) throw new ForbiddenException('Only admins or project managers can perform this action');
  }

  private async isPmForUser(pmUserId: string, targetUserId: string): Promise<boolean> {
    const count = await this.prisma.projectMember.count({
      where: {
        userId: pmUserId,
        projectRole: ProjectRole.PROJECT_MANAGER,
        project: { members: { some: { userId: targetUserId } } },
      },
    });
    return count > 0;
  }

  private async getPmTeamMemberIds(pmUserId: string): Promise<string[]> {
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId: pmUserId, projectRole: ProjectRole.PROJECT_MANAGER },
      select: { projectId: true },
    });
    if (memberships.length === 0) return [];
    const projectIds = memberships.map((m) => m.projectId);
    const members = await this.prisma.projectMember.findMany({
      where: { projectId: { in: projectIds }, userId: { not: pmUserId } },
      select: { userId: true },
    });
    return [...new Set(members.map((m) => m.userId))];
  }

  private async findOneOrFail(id: string) {
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: LEAVE_INCLUDE,
    });
    if (!leave) throw new NotFoundException(`Leave request ${id} not found`);
    return leave;
  }
}

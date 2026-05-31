import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveStatus, SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveLeaveRequestDto, CreateLeaveRequestDto, RejectLeaveRequestDto } from './dto/leave-request.dto';

const LEAVE_INCLUDE = {
  user: { select: { id: true, fullName: true, profilePhoto: true } },
  approvedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class LeaveRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateLeaveRequestDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end < start) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const totalDays =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping pending or approved leaves
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        userId,
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

    return this.prisma.leaveRequest.create({
      data: {
        userId,
        type: dto.type,
        startDate: start,
        endDate: end,
        totalDays,
        reason: dto.reason ?? null,
      },
      include: LEAVE_INCLUDE,
    });
  }

  findAll(
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
      where['userId'] = requestingUserId;
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
    this.assertAdmin(systemRole);
    const leave = await this.findOneOrFail(id);
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only PENDING leave requests can be approved');
    }
    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
        approvalNote: dto.approvalNote ?? null,
      },
      include: LEAVE_INCLUDE,
    });
  }

  async reject(
    id: string,
    approverId: string,
    systemRole: SystemRole,
    dto: RejectLeaveRequestDto,
  ) {
    this.assertAdmin(systemRole);
    const leave = await this.findOneOrFail(id);
    if (leave.status === LeaveStatus.CANCELLED) {
      throw new BadRequestException('Cannot reject a cancelled leave request');
    }
    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        approvedById: approverId,
        approvedAt: new Date(),
        approvalNote: dto.approvalNote ?? null,
      },
      include: LEAVE_INCLUDE,
    });
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

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
      include: LEAVE_INCLUDE,
    });
  }

  private assertAdmin(systemRole: SystemRole) {
    if (
      systemRole !== SystemRole.SUPER_USER &&
      systemRole !== SystemRole.ADMIN
    ) {
      throw new ForbiddenException('Only admins can perform this action');
    }
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

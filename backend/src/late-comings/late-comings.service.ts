import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveStatus, ProjectRole, SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLateComingDto } from './dto/late-coming.dto';

const INCLUDE = {
  user:       { select: { id: true, fullName: true, profilePhoto: true } },
  recordedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class LateComingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requestingUserId: string, systemRole: SystemRole, dto: CreateLateComingDto) {
    const isAdmin =
      systemRole === SystemRole.SUPER_USER ||
      systemRole === SystemRole.ADMIN ||
      systemRole === SystemRole.BU_HEAD;

    if (!isAdmin) {
      const isPm = await this.isUserAPm(requestingUserId);
      if (!isPm) throw new ForbiddenException('Only admins and project managers can record late comings');
    }

    const date = new Date(dto.date);

    const leaveConflict = await this.prisma.leaveRequest.findFirst({
      where: {
        userId: dto.targetUserId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: date },
        endDate:   { gte: date },
      },
    });

    if (leaveConflict) {
      throw new ConflictException(
        `A ${leaveConflict.isPlanned ? 'planned' : 'unplanned'} leave is already recorded for ${dto.date}. Cannot add a late coming on a leave day.`,
      );
    }

    return this.prisma.lateComingLog.create({
      data: {
        userId:      dto.targetUserId,
        date,
        minutesLate: dto.minutesLate,
        reason:      dto.reason ?? null,
        recordedById: requestingUserId,
      },
      include: INCLUDE,
    });
  }

  async findAll(
    requestingUserId: string,
    systemRole: SystemRole,
    query: { userId?: string },
    managedBuId?: string | null,
  ) {
    const isAdmin =
      systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;

    const where: Record<string, unknown> = {};

    if (isAdmin) {
      if (query.userId) where['userId'] = query.userId;
    } else if (systemRole === SystemRole.BU_HEAD && managedBuId) {
      where['user'] = { department: { businessUnitId: managedBuId } };
      if (query.userId) where['userId'] = query.userId;
    } else {
      const teamIds = await this.getPmTeamMemberIds(requestingUserId);
      where['userId'] = teamIds.length > 0
        ? { in: [requestingUserId, ...teamIds] }
        : requestingUserId;
    }

    return this.prisma.lateComingLog.findMany({
      where,
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  async remove(id: string, requestingUserId: string, systemRole: SystemRole) {
    const isAdmin =
      systemRole === SystemRole.SUPER_USER ||
      systemRole === SystemRole.ADMIN ||
      systemRole === SystemRole.BU_HEAD;

    const record = await this.prisma.lateComingLog.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Late coming log not found');

    if (!isAdmin) {
      const isPm = await this.isUserAPm(requestingUserId);
      if (!isPm) throw new ForbiddenException('Only admins and project managers can delete late coming logs');
    }

    await this.prisma.lateComingLog.delete({ where: { id } });
  }

  private async isUserAPm(userId: string): Promise<boolean> {
    const count = await this.prisma.projectMember.count({
      where: { userId, projectRole: ProjectRole.PROJECT_MANAGER },
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
}

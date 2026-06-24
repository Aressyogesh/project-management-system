import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectRole, SystemRole, UpskillStatus, UpskillType } from '@prisma/client';

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
  constructor(private readonly prisma: PrismaService) {}

  async isManager(userId: string, systemRole: SystemRole): Promise<boolean> {
    if (systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER) return true;
    const pm = await this.prisma.projectMember.findFirst({
      where: { userId, projectRole: ProjectRole.PROJECT_MANAGER },
    });
    return !!pm;
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

    return this.prisma.upskillAssignment.create({
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
    options: { mine?: boolean; status?: UpskillStatus; assignedToId?: string; period?: string },
  ) {
    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;

    if (options.mine) {
      const periodFilter = options.period ? this.buildPeriodFilter(options.period) : {};
      return this.prisma.upskillAssignment.findMany({
        where: {
          assignedToId: callerId,
          ...(options.status ? { status: options.status } : {}),
          ...periodFilter,
        },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          progressLogs: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    let assignedToFilter: string | undefined;
    if (isPrivileged) {
      assignedToFilter = options.assignedToId;
    } else {
      // PM: only assignments they created
      assignedToFilter = options.assignedToId;
    }

    return this.prisma.upskillAssignment.findMany({
      where: {
        ...(isPrivileged ? {} : { createdById: callerId }),
        ...(assignedToFilter ? { assignedToId: assignedToFilter } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        progressLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
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

    return this.prisma.upskillAssignment.update({
      where: { id: assignmentId },
      data: { status: UpskillStatus.SUBMITTED, evidenceFilePath: filePath, evidenceFileName: fileName, rejectionReason: null },
    });
  }

  async approveAssignment(assignmentId: string, approverId: string, systemRole: SystemRole) {
    const assignment = await this.prisma.upskillAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.status !== UpskillStatus.SUBMITTED) {
      throw new ConflictException('Assignment must be in SUBMITTED state to approve');
    }

    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    if (!isPrivileged && assignment.createdById !== approverId) {
      throw new ForbiddenException('You can only approve assignments you created');
    }

    return this.prisma.upskillAssignment.update({
      where: { id: assignmentId },
      data: { status: UpskillStatus.APPROVED, approvedById: approverId, approvedAt: new Date() },
    });
  }

  async rejectAssignment(assignmentId: string, rejectorId: string, reason: string, systemRole: SystemRole) {
    if (!reason?.trim()) throw new BadRequestException('reason is required to reject an assignment');

    const assignment = await this.prisma.upskillAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.status !== UpskillStatus.SUBMITTED) {
      throw new ConflictException('Assignment must be in SUBMITTED state to reject');
    }

    const isPrivileged = systemRole === SystemRole.ADMIN || systemRole === SystemRole.SUPER_USER;
    if (!isPrivileged && assignment.createdById !== rejectorId) {
      throw new ForbiddenException('You can only reject assignments you created');
    }

    return this.prisma.upskillAssignment.update({
      where: { id: assignmentId },
      data: { status: UpskillStatus.REJECTED, rejectionReason: reason.trim() },
    });
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

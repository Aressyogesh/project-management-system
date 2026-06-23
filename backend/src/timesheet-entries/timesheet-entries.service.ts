import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRole, SystemRole, TimesheetApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimesheetEntryDto, RejectTimesheetEntryDto, UpdateTimesheetEntryDto } from './dto/timesheet-entry.dto';

const ENTRY_INCLUDE = {
  user: { select: { id: true, fullName: true, profilePhoto: true } },
  approvedBy: { select: { id: true, fullName: true } },
  workItem: {
    select: {
      id: true,
      title: true,
      type: true,
      estimatedHours: true,
      project: { select: { id: true, name: true } },
    },
  },
};

@Injectable()
export class TimesheetEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workItemId: string, userId: string, systemRole: SystemRole, dto: CreateTimesheetEntryDto) {
    const item = await this.prisma.workItem.findUnique({
      where: { id: workItemId },
      select: { assigneeId: true, reporterId: true, title: true, parentId: true },
    });
    if (!item) throw new NotFoundException(`Work item ${workItemId} not found`);

    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    const isOwner = item.assigneeId === userId || item.reporterId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Only the assignee or reporter can log time on this item');
    }

    const { date, ...restDto } = dto;
    const entry = await this.prisma.timesheetEntry.create({
      data: { workItemId, userId, ...restDto, date: new Date(date), approvalStatus: TimesheetApprovalStatus.SUBMITTED },
      include: ENTRY_INCLUDE,
    });

    const logSummary = `${dto.hours}h on ${date}${dto.description ? ` — ${dto.description}` : ''}`;

    const activities = [
      this.prisma.workItemActivity.create({
        data: {
          workItemId,
          userId,
          action: 'time_logged',
          field: 'time',
          oldValue: null,
          newValue: logSummary.slice(0, 490),
        },
      }),
    ];

    // Propagate to parent so the parent's activity log shows child time logs
    if (item.parentId) {
      activities.push(
        this.prisma.workItemActivity.create({
          data: {
            workItemId: item.parentId,
            userId,
            action: 'child_time_logged',
            field: 'time',
            oldValue: item.title,
            newValue: logSummary.slice(0, 490),
          },
        }),
      );
    }

    await Promise.all(activities);

    return entry;
  }

  findByWorkItem(workItemId: string) {
    return this.prisma.timesheetEntry.findMany({
      where: { workItemId },
      include: { user: { select: { id: true, fullName: true, profilePhoto: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async findMyEntries(
    requestingUserId: string,
    systemRole: SystemRole,
    projectRole: ProjectRole | null,
    queryUserId?: string,
    from?: string,
    to?: string,
    projectId?: string,
  ) {
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    let isManager = projectRole === ProjectRole.PROJECT_MANAGER || projectRole === ProjectRole.TEAM_LEAD;

    // projectRole is not included in the JWT payload, so check the DB for PM/TL memberships
    if (!isAdmin && !isManager) {
      const pmMembership = await this.prisma.projectMember.findFirst({
        where: { userId: requestingUserId, projectRole: { in: [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD] } },
        select: { id: true },
      });
      isManager = !!pmMembership;
    }

    const canViewAll = isAdmin || isManager;

    // Build where clause
    const where: Record<string, unknown> = {};

    // User filter: admins/managers can view any user; others only see their own
    if (canViewAll && queryUserId) {
      where['userId'] = queryUserId;
    } else if (!canViewAll) {
      where['userId'] = requestingUserId;
    }
    // If canViewAll && !queryUserId → no userId filter (see everyone)

    // Date range filter
    if (from || to) {
      where['date'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    // Project filter — resolve via explicit workItemId lookup
    if (projectId) {
      const projectWorkItems = await this.prisma.workItem.findMany({
        where: { projectId },
        select: { id: true },
      });
      where['workItemId'] = { in: projectWorkItems.map((w) => w.id) };
    }

    return this.prisma.timesheetEntry.findMany({
      where,
      include: ENTRY_INCLUDE,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, userId: string, dto: UpdateTimesheetEntryDto) {
    const entry = await this.findOneOrFail(id);
    if (entry.userId !== userId) {
      throw new ForbiddenException('You can only edit your own timesheet entries');
    }
    if (entry.approvalStatus === TimesheetApprovalStatus.APPROVED) {
      throw new BadRequestException('Cannot edit an approved timesheet entry');
    }
    const { date, ...restDto } = dto;
    return this.prisma.timesheetEntry.update({
      where: { id },
      data: { ...restDto, ...(date !== undefined && { date: new Date(date) }) },
    });
  }

  async remove(id: string, userId: string, systemRole: SystemRole) {
    const entry = await this.findOneOrFail(id);
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    if (entry.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own timesheet entries');
    }
    if (entry.approvalStatus === TimesheetApprovalStatus.APPROVED && !isAdmin) {
      throw new BadRequestException('Cannot delete an approved timesheet entry');
    }
    return this.prisma.timesheetEntry.delete({ where: { id } });
  }

  async submit(id: string, userId: string) {
    const entry = await this.findOneOrFail(id);
    if (entry.userId !== userId) {
      throw new ForbiddenException('You can only submit your own timesheet entries');
    }
    if (entry.approvalStatus !== TimesheetApprovalStatus.PENDING && entry.approvalStatus !== TimesheetApprovalStatus.REJECTED) {
      throw new BadRequestException(`Entry is already ${entry.approvalStatus.toLowerCase()}`);
    }
    return this.prisma.timesheetEntry.update({
      where: { id },
      data: { approvalStatus: TimesheetApprovalStatus.SUBMITTED, rejectionNote: null },
    });
  }

  async approve(id: string, approverId: string, systemRole: SystemRole, projectRole: ProjectRole | null) {
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    const isManager = projectRole === ProjectRole.PROJECT_MANAGER || projectRole === ProjectRole.TEAM_LEAD;
    if (!isAdmin && !isManager) {
      throw new ForbiddenException('Only Project Managers, Team Leads, or Admins can approve timesheets');
    }
    const entry = await this.findOneOrFail(id);
    if (entry.approvalStatus !== TimesheetApprovalStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted entries can be approved');
    }
    return this.prisma.timesheetEntry.update({
      where: { id },
      data: {
        approvalStatus: TimesheetApprovalStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionNote: null,
      },
    });
  }

  async reject(id: string, approverId: string, systemRole: SystemRole, projectRole: ProjectRole | null, dto: RejectTimesheetEntryDto) {
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    const isManager = projectRole === ProjectRole.PROJECT_MANAGER || projectRole === ProjectRole.TEAM_LEAD;
    if (!isAdmin && !isManager) {
      throw new ForbiddenException('Only Project Managers, Team Leads, or Admins can reject timesheets');
    }
    const entry = await this.findOneOrFail(id);
    if (entry.approvalStatus !== TimesheetApprovalStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted entries can be rejected');
    }
    return this.prisma.timesheetEntry.update({
      where: { id },
      data: {
        approvalStatus: TimesheetApprovalStatus.REJECTED,
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionNote: dto.rejectionNote ?? null,
      },
    });
  }

  private async findOneOrFail(id: string) {
    const entry = await this.prisma.timesheetEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Timesheet entry ${id} not found`);
    return entry;
  }
}

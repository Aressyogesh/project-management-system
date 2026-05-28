import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimesheetEntryDto, UpdateTimesheetEntryDto } from './dto/timesheet-entry.dto';

@Injectable()
export class TimesheetEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workItemId: string, userId: string, systemRole: SystemRole, dto: CreateTimesheetEntryDto) {
    const item = await this.prisma.workItem.findUnique({
      where: { id: workItemId },
      select: { assigneeId: true, reporterId: true },
    });
    if (!item) throw new NotFoundException(`Work item ${workItemId} not found`);

    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    const isOwner = item.assigneeId === userId || item.reporterId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Only the assignee or reporter can log time on this item');
    }

    return this.prisma.timesheetEntry.create({
      data: { workItemId, userId, ...dto },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }

  findByWorkItem(workItemId: string) {
    return this.prisma.timesheetEntry.findMany({
      where: { workItemId },
      include: { user: { select: { id: true, fullName: true, profilePhoto: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async update(id: string, userId: string, dto: UpdateTimesheetEntryDto) {
    const entry = await this.findOneOrFail(id);
    if (entry.userId !== userId) {
      throw new ForbiddenException('You can only edit your own timesheet entries');
    }
    return this.prisma.timesheetEntry.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string, systemRole: SystemRole) {
    const entry = await this.findOneOrFail(id);
    const isAdmin = systemRole === SystemRole.SUPER_USER || systemRole === SystemRole.ADMIN;
    if (entry.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own timesheet entries');
    }
    return this.prisma.timesheetEntry.delete({ where: { id } });
  }

  private async findOneOrFail(id: string) {
    const entry = await this.prisma.timesheetEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Timesheet entry ${id} not found`);
    return entry;
  }
}

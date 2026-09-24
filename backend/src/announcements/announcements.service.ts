import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementScope, AuditAction, AuditEntity, ProjectRole, SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

const CREATOR_SELECT = { id: true, fullName: true, profilePhoto: true };
const ITEM_SELECT = {
  id: true,
  title: true,
  content: true,
  scope: true,
  projectId: true,
  project: { select: { id: true, name: true } },
  createdAt: true,
  createdBy: { select: CREATOR_SELECT },
};

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private isAdminOrSuper(role: SystemRole) {
    return role === SystemRole.SUPER_USER || role === SystemRole.ADMIN || role === SystemRole.BU_HEAD;
  }

  private async getPmProjectIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId, projectRole: ProjectRole.PROJECT_MANAGER },
      select: { projectId: true },
    });
    return memberships.map((m) => m.projectId);
  }

  private async getUserProjectIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    return memberships.map((m) => m.projectId);
  }

  async create(dto: CreateAnnouncementDto, createdById: string, userRole: SystemRole) {
    const scope = dto.scope ?? AnnouncementScope.GLOBAL;
    const isAdmin = this.isAdminOrSuper(userRole);

    // ── Bulk broadcast: one announcement per project ──────────────────────────
    if (dto.projectIds && dto.projectIds.length > 0) {
      if (!isAdmin) {
        const pmIds = await this.getPmProjectIds(createdById);
        if (pmIds.length === 0) throw new ForbiddenException('Only admins or project managers can post announcements');
        for (const pid of dto.projectIds) {
          if (!pmIds.includes(pid)) throw new ForbiddenException('You can only post announcements for your own projects');
        }
      }

      const results = await this.prisma.$transaction(
        dto.projectIds.map((pid) =>
          this.prisma.announcement.create({
            data: { title: dto.title, content: dto.content, scope: AnnouncementScope.PROJECT, projectId: pid, createdById },
            select: ITEM_SELECT,
          }),
        ),
      );

      results.forEach((r) => {
        this.auditLogs.log({
          userId: createdById,
          action: AuditAction.ANNOUNCEMENT_CREATED,
          entity: AuditEntity.ANNOUNCEMENT,
          entityId: r.id,
          entityTitle: r.title,
          projectId: r.projectId ?? undefined,
        });
      });

      return results;
    }

    // ── Single announcement ───────────────────────────────────────────────────
    if (isAdmin) {
      if (scope === AnnouncementScope.PROJECT && !dto.projectId) {
        throw new ForbiddenException('projectId is required for PROJECT-scoped announcements');
      }
    } else {
      const pmIds = await this.getPmProjectIds(createdById);
      if (pmIds.length === 0) throw new ForbiddenException('Only admins or project managers can post announcements');
      if (scope !== AnnouncementScope.PROJECT) throw new ForbiddenException('Project managers can only create project-scoped announcements');
      if (!dto.projectId) throw new ForbiddenException('projectId is required');
      if (!pmIds.includes(dto.projectId)) throw new ForbiddenException('You can only post announcements for your own projects');
    }

    const result = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        scope,
        projectId: scope === AnnouncementScope.PROJECT ? dto.projectId : null,
        createdById,
      },
      select: ITEM_SELECT,
    });

    this.auditLogs.log({
      userId: createdById,
      action: AuditAction.ANNOUNCEMENT_CREATED,
      entity: AuditEntity.ANNOUNCEMENT,
      entityId: result.id,
      entityTitle: result.title,
      projectId: result.projectId ?? undefined,
    });

    return result;
  }

  private celebrationFilter() {
    return { NOT: { title: { startsWith: 'Team Celebrations — ' } } };
  }

  async findAll(
    query: { page?: number; limit?: number },
    userId: string,
    userRole: SystemRole,
  ) {
    const isAdmin = this.isAdminOrSuper(userRole);
    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const celebration = this.celebrationFilter();
    let where: object = celebration;
    if (!isAdmin) {
      const pmIds = await this.getPmProjectIds(userId);
      if (pmIds.length === 0) throw new ForbiddenException('Access denied');
      where = {
        AND: [
          celebration,
          {
            OR: [
              { scope: AnnouncementScope.GLOBAL },
              { scope: AnnouncementScope.PROJECT, projectId: { in: pmIds } },
            ],
          },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({ where, skip, take: safeLimit, orderBy: { createdAt: 'desc' }, select: ITEM_SELECT }),
      this.prisma.announcement.count({ where }),
    ]);

    return { data, total, page, lastPage: Math.ceil(total / safeLimit) || 1 };
  }

  async findLatestForWidget(userId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    const celebration = this.celebrationFilter();

    const scopeFilter =
      projectIds.length > 0
        ? { OR: [{ scope: AnnouncementScope.GLOBAL }, { scope: AnnouncementScope.PROJECT, projectId: { in: projectIds } }] }
        : { scope: AnnouncementScope.GLOBAL };

    const where = { AND: [celebration, scopeFilter] };

    const data = await this.prisma.announcement.findMany({
      where,
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: ITEM_SELECT,
    });

    return { data, total: data.length, page: 1, lastPage: 1 };
  }

  async remove(id: string, userId: string, userRole: SystemRole) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');

    if (!this.isAdminOrSuper(userRole) && existing.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own announcements');
    }

    await this.prisma.announcement.delete({ where: { id } });

    this.auditLogs.log({
      userId,
      action: AuditAction.ANNOUNCEMENT_DELETED,
      entity: AuditEntity.ANNOUNCEMENT,
      entityId: id,
      entityTitle: existing.title,
      projectId: existing.projectId ?? undefined,
    });
  }
}

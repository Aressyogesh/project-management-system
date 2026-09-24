import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectRole, SystemRole } from '@prisma/client';

@Injectable()
export class SelfLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // Returns true if requestingUserId is a PM/TL in any project that also contains targetUserId
  async canViewUserLogs(requestingUserId: string, targetUserId: string): Promise<boolean> {
    const managedProjects = await this.prisma.projectMember.findMany({
      where: { userId: requestingUserId, projectRole: { in: [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD] } },
      select: { projectId: true },
    });
    if (managedProjects.length === 0) return false;
    const projectIds = managedProjects.map((m) => m.projectId);
    const membership = await this.prisma.projectMember.findFirst({
      where: { userId: targetUserId, projectId: { in: projectIds } },
      select: { id: true },
    });
    return !!membership;
  }

  // ─── Leave Logs ───────────────────────────────────────────────────────────────

  async createLeaveLog(
    userId: string,
    dto: { date: string; type: string; description?: string },
  ) {
    try {
      return await this.prisma.leaveLog.create({
        data: {
          userId,
          date: new Date(dto.date),
          type: dto.type,
          description: dto.description,
        },
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException('Leave log already exists for this date');
      }
      throw e;
    }
  }

  findLeaveLogs(userId: string, period?: string) {
    const where: { userId: string; date?: { gte: Date; lt: Date } } = { userId };
    if (period) {
      const [year, month] = period.split('-').map(Number);
      where.date = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }
    return this.prisma.leaveLog.findMany({ where, orderBy: { date: 'desc' } });
  }

  async deleteLeaveLog(
    id: string,
    requestingUserId: string,
    systemRole: SystemRole,
  ) {
    const log = await this.prisma.leaveLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Leave log not found');
    if (
      log.userId !== requestingUserId &&
      systemRole !== SystemRole.ADMIN &&
      systemRole !== SystemRole.SUPER_USER
    ) {
      throw new ForbiddenException('Not authorized to delete this leave log');
    }
    return this.prisma.leaveLog.delete({ where: { id } });
  }

  // ─── Learning Logs ────────────────────────────────────────────────────────────

  createLearningLog(
    userId: string,
    dto: { period: string; topic: string; hours: number; description?: string },
  ) {
    return this.prisma.learningLog.create({
      data: { userId, ...dto },
    });
  }

  findLearningLogs(userId: string, period?: string) {
    return this.prisma.learningLog.findMany({
      where: { userId, ...(period ? { period } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteLearningLog(
    id: string,
    requestingUserId: string,
    systemRole: SystemRole,
  ) {
    const log = await this.prisma.learningLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Learning log not found');
    if (
      log.userId !== requestingUserId &&
      systemRole !== SystemRole.ADMIN &&
      systemRole !== SystemRole.SUPER_USER
    ) {
      throw new ForbiddenException('Not authorized to delete this learning log');
    }
    return this.prisma.learningLog.delete({ where: { id } });
  }

  // ─── Innovation Logs ──────────────────────────────────────────────────────────

  createInnovationLog(
    userId: string,
    dto: { period: string; title: string; impact: string; type: string },
  ) {
    return this.prisma.innovationLog.create({
      data: { userId, ...dto },
    });
  }

  findInnovationLogs(userId: string, period?: string) {
    return this.prisma.innovationLog.findMany({
      where: { userId, ...(period ? { period } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteInnovationLog(
    id: string,
    requestingUserId: string,
    systemRole: SystemRole,
  ) {
    const log = await this.prisma.innovationLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Innovation log not found');
    if (
      log.userId !== requestingUserId &&
      systemRole !== SystemRole.ADMIN &&
      systemRole !== SystemRole.SUPER_USER
    ) {
      throw new ForbiddenException('Not authorized to delete this innovation log');
    }
    return this.prisma.innovationLog.delete({ where: { id } });
  }
}

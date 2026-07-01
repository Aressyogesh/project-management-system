import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRole, SystemRole } from '@prisma/client';
import {
  PROJECT_ID_SOURCE_KEY,
  PROJECT_ROLES_KEY,
  ProjectIdSource,
} from '../decorators/project-roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<ProjectRole[]>(
      PROJECT_ROLES_KEY,
      context.getHandler(),
    );

    // No decorator — allow through (read endpoints)
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; systemRole: SystemRole };

    // SUPER_USER and ADMIN bypass project-level check
    if (
      user.systemRole === SystemRole.SUPER_USER ||
      user.systemRole === SystemRole.ADMIN
    ) {
      return true;
    }

    const source =
      this.reflector.get<ProjectIdSource>(
        PROJECT_ID_SOURCE_KEY,
        context.getHandler(),
      ) ?? 'param';

    const projectId = await this.resolveProjectId(request.params, source);
    if (!projectId) throw new ForbiddenException('Insufficient permissions');

    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId: user.id },
      select: { projectRole: true },
    });

    if (!membership) throw new ForbiddenException('Insufficient permissions');

    if (!requiredRoles.includes(membership.projectRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    request.user.projectRole = membership.projectRole;
    return true;
  }

  private async resolveProjectId(
    params: Record<string, string>,
    source: ProjectIdSource,
  ): Promise<string | null> {
    if (source === 'param' || params.projectId) {
      return params.projectId ?? null;
    }

    const id = params.id;
    if (!id) return null;

    if (source === 'taskList') {
      const tl = await this.prisma.taskList.findUnique({
        where: { id },
        select: { projectId: true },
      });
      return tl?.projectId ?? null;
    }

    if (source === 'task') {
      const task = await this.prisma.task.findUnique({
        where: { id },
        select: { projectId: true },
      });
      return task?.projectId ?? null;
    }

    if (source === 'milestone') {
      const ms = await this.prisma.milestone.findUnique({
        where: { id },
        select: { projectId: true },
      });
      return ms?.projectId ?? null;
    }

    if (source === 'allocation') {
      const alloc = await this.prisma.taskAllocation.findUnique({
        where: { id },
        select: { task: { select: { projectId: true } } },
      });
      return alloc?.task?.projectId ?? null;
    }

    if (source === 'sprint') {
      const sprint = await this.prisma.sprint.findUnique({
        where: { id },
        select: { projectId: true },
      });
      return sprint?.projectId ?? null;
    }

    if (source === 'workItem') {
      const item = await this.prisma.workItem.findUnique({
        where: { id },
        select: { projectId: true },
      });
      return item?.projectId ?? null;
    }

    if (source === 'timesheetEntry') {
      const entry = await this.prisma.timesheetEntry.findUnique({
        where: { id },
        select: { workItem: { select: { projectId: true } } },
      });
      return entry?.workItem?.projectId ?? null;
    }

    return null;
  }
}

import { Controller, Get, Query, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SystemRole } from '@prisma/client';

type AuthUser = { id: string; systemRole: SystemRole };

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpi')
  getKpi(
    @Query('period') period = '2026-05',
    @Query('userId') userId: string | undefined,
    @Request() req: { user: { id: string; systemRole: SystemRole } },
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    const targetUserId = isAdmin ? (userId ?? undefined) : req.user.id;
    return this.analyticsService.getKpi(period, targetUserId ?? req.user.id, isAdmin && !userId);
  }

  @Get('reports/productivity')
  getProductivity(
    @Query('period') period = '2026-05',
    @Request() req: { user: AuthUser },
    @Query('projectId') projectId?: string,
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    return this.analyticsService.getProductivityReport(period, projectId, req.user.id, isAdmin);
  }

  @Get('reports/projects')
  getProjects(
    @Query('period') period = '2026-05',
    @Query('projectId') projectId?: string,
  ) {
    return this.analyticsService.getProjectsReport(period, projectId);
  }

  @Get('reports/bugs')
  getBugs(
    @Query('period') period = '2026-05',
    @Query('projectId') projectId?: string,
  ) {
    return this.analyticsService.getBugsReport(period, projectId);
  }

  @Get('reports/allocation')
  getAllocation(
    @Query('period') period = '2026-05',
    @Request() req: { user: AuthUser },
    @Query('projectId') projectId?: string,
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    return this.analyticsService.getAllocationReport(period, projectId, req.user.id, isAdmin);
  }

  @Get('my-project-role')
  async getMyProjectRole(@Request() req: { user: AuthUser }) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    if (isAdmin) return { isManager: true };
    const ids = await this.analyticsService.getManagedProjectIds(req.user.id);
    return { isManager: ids.length > 0 };
  }

  @Get('reports/timesheet')
  getTimesheet(
    @Query('period') period = '2026-05',
    @Request() req: { user: AuthUser },
    @Query('projectId') projectId?: string,
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    return this.analyticsService.getTimesheetReport(period, projectId, req.user.id, isAdmin);
  }

  @Get('reports/capacity')
  getCapacity(
    @Query('period') period = '2026-05',
    @Request() req: { user: AuthUser },
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    return this.analyticsService.getCapacityReport(period, req.user.id, isAdmin);
  }

  @Get('reports/planned-vs-actual')
  getPlannedVsActual(
    @Query('period') period = '2026-05',
    @Request() req: { user: AuthUser },
    @Query('projectId') projectId?: string,
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    return this.analyticsService.getPlannedVsActualReport(period, projectId, req.user.id, isAdmin);
  }
}

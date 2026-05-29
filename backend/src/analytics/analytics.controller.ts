import { Controller, Get, Query, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SystemRole } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpi')
  getKpi(
    @Query('period') period = '2026-05',
    @Query('userId') userId: string | undefined,
    @Request() req: { user: { userId: string; systemRole: SystemRole } },
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    const targetUserId = isAdmin ? (userId ?? undefined) : req.user.userId;
    return this.analyticsService.getKpi(period, targetUserId ?? req.user.userId, isAdmin && !userId);
  }

  @Get('reports/productivity')
  getProductivity(
    @Query('period') period = '2026-05',
    @Query('projectId') projectId?: string,
  ) {
    return this.analyticsService.getProductivityReport(period, projectId);
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
    @Query('projectId') projectId?: string,
  ) {
    return this.analyticsService.getAllocationReport(period, projectId);
  }

  @Get('reports/timesheet')
  getTimesheet(
    @Query('period') period = '2026-05',
    @Query('projectId') projectId?: string,
  ) {
    return this.analyticsService.getTimesheetReport(period, projectId);
  }

  @Get('reports/capacity')
  getCapacity(@Query('period') period = '2026-05') {
    return this.analyticsService.getCapacityReport(period);
  }
}

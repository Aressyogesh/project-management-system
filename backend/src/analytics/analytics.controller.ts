import { Body, Controller, Delete, Get, Param, Post, Query, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SystemRole } from '@prisma/client';

type AuthUser = { id: string; systemRole: SystemRole; managedBusinessUnitId?: string | null };

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpi/notes')
  getKpiNotes(
    @Query('userId') userId: string,
    @Query('period') period: string,
  ) {
    return this.analyticsService.getKpiNotes(userId, period);
  }

  @Post('kpi/notes')
  addKpiNote(
    @Body() body: { userId: string; metricId: string; period: string; content: string },
    @Request() req: { user: AuthUser },
  ) {
    return this.analyticsService.addKpiNote(req.user.id, body);
  }

  @Delete('kpi/notes/:id')
  deleteKpiNote(
    @Param('id') id: string,
    @Request() req: { user: AuthUser },
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER ||
      req.user.systemRole === SystemRole.BU_HEAD;
    return this.analyticsService.deleteKpiNote(id, req.user.id, isAdmin);
  }

  @Get('kpi')
  getKpi(
    @Query('period') period = '2026-05',
    @Query('userId') userId: string | undefined,
    @Request() req: { user: AuthUser },
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    const managedBusinessUnitId =
      req.user.systemRole === SystemRole.BU_HEAD ? req.user.managedBusinessUnitId : null;
    const isPrivileged = isAdmin || !!managedBusinessUnitId;
    const targetUserId = isPrivileged ? (userId ?? undefined) : req.user.id;
    return this.analyticsService.getKpi(
      period,
      targetUserId ?? req.user.id,
      isAdmin && !userId,
      !userId ? managedBusinessUnitId : null,
    );
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
    const managedBusinessUnitId =
      req.user.systemRole === SystemRole.BU_HEAD ? req.user.managedBusinessUnitId : null;
    return this.analyticsService.getProductivityReport(period, projectId, req.user.id, isAdmin, managedBusinessUnitId);
  }

  @Get('reports/projects')
  getProjects(
    @Query('period') period = '2026-05',
    @Request() req: { user: AuthUser },
    @Query('projectId') projectId?: string,
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    const managedBusinessUnitId =
      req.user.systemRole === SystemRole.BU_HEAD ? req.user.managedBusinessUnitId : null;
    return this.analyticsService.getProjectsReport(period, projectId, req.user.id, isAdmin, managedBusinessUnitId);
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
    const managedBusinessUnitId =
      req.user.systemRole === SystemRole.BU_HEAD ? req.user.managedBusinessUnitId : null;
    return this.analyticsService.getAllocationReport(period, projectId, req.user.id, isAdmin, managedBusinessUnitId);
  }

  @Get('my-projects')
  getMyProjects(@Request() req: { user: AuthUser }) {
    return this.analyticsService.getMyProjects(req.user.id);
  }

  @Get('my-project-role')
  async getMyProjectRole(@Request() req: { user: AuthUser }) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER ||
      req.user.systemRole === SystemRole.BU_HEAD;
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
    const managedBusinessUnitId =
      req.user.systemRole === SystemRole.BU_HEAD ? req.user.managedBusinessUnitId : null;
    return this.analyticsService.getTimesheetReport(period, projectId, req.user.id, isAdmin, managedBusinessUnitId);
  }

  @Get('reports/capacity')
  getCapacity(
    @Query('period') period = '2026-05',
    @Query('projectId') projectId: string | undefined,
    @Request() req: { user: AuthUser },
  ) {
    const isAdmin =
      req.user.systemRole === SystemRole.ADMIN ||
      req.user.systemRole === SystemRole.SUPER_USER;
    const managedBusinessUnitId =
      req.user.systemRole === SystemRole.BU_HEAD ? req.user.managedBusinessUnitId : null;
    return this.analyticsService.getCapacityReport(period, req.user.id, isAdmin, projectId || undefined, managedBusinessUnitId);
  }

  @Get('reports/drill-down')
  getDrillDown(
    @Query('period') period: string,
    @Query('projectId') projectId?: string,
    @Query('userId') userId?: string,
    @Query('workItemType') workItemType?: string,
    @Query('severity') severity?: string,
    @Query('classification') classification?: string,
    @Query('statusFilter') statusFilter?: string,
    @Query('completedOnly') completedOnly?: string,
    @Query('noDateFilter') noDateFilter?: string,
  ) {
    return this.analyticsService.getDrillDown({
      period,
      projectId,
      userId,
      workItemType,
      severity,
      classification,
      statusFilter: statusFilter === 'done' ? 'done' : undefined,
      completedOnly: completedOnly === 'true',
      noDateFilter: noDateFilter === 'true',
    });
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
    const managedBusinessUnitId =
      req.user.systemRole === SystemRole.BU_HEAD ? req.user.managedBusinessUnitId : null;
    return this.analyticsService.getPlannedVsActualReport(period, projectId, req.user.id, isAdmin, managedBusinessUnitId);
  }
}

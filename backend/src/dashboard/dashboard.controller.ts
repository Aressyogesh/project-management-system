import { BadRequestException, Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  Announcement,
  DashboardService,
  DashboardStats,
  MemberActivity,
  ProjectProgress,
  TasksProgress,
} from './dashboard.service';

interface JwtUser {
  sub: string;
  email: string;
  role: SystemRole;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get role-based dashboard statistics' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'month',     required: false, description: 'YYYY-MM — scopes all stats to this project+month' })
  getStats(
    @CurrentUser() user: JwtUser,
    @Query('projectId') projectId?: string,
    @Query('month')     month?: string,
  ): Promise<DashboardStats> {
    return this.dashboardService.getStats(user.sub, user.role, projectId, month);
  }

  @Get('projects-progress')
  @ApiOperation({ summary: 'Get project-wise team progress (Super User and Admin only)' })
  getProjectsProgress(@CurrentUser() user: JwtUser): Promise<ProjectProgress[]> {
    if (user.role === SystemRole.EMPLOYEE) throw new ForbiddenException('Access denied');
    return this.dashboardService.getProjectsProgress(user.sub, user.role);
  }

  @Get('team-activity')
  @ApiOperation({ summary: 'Get per-member activity for a project and month (Admin+ only)' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'month', required: true, description: 'YYYY-MM' })
  getTeamActivity(
    @CurrentUser() user: JwtUser,
    @Query('projectId') projectId: string,
    @Query('month') month: string,
  ): Promise<MemberActivity[]> {
    if (user.role === SystemRole.EMPLOYEE) throw new ForbiddenException('Access denied');
    if (!projectId || !month) throw new BadRequestException('projectId and month are required');
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('month must be in YYYY-MM format');
    return this.dashboardService.getTeamActivity(projectId, month);
  }

  @Get('tasks-progress')
  @ApiOperation({ summary: 'Get task status distribution — last 7d / 30d / all time' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'period',    required: false, enum: ['7d', '30d', 'all'] })
  getTasksProgress(
    @Query('projectId') projectId?: string,
    @Query('period')    period: '7d' | '30d' | 'all' = 'all',
  ): Promise<TasksProgress> {
    return this.dashboardService.getTasksProgress(projectId, period);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get activity data — monthly or weekly, optionally scoped to a project' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'period',    required: false, enum: ['monthly', 'weekly'] })
  getActivityData(
    @Query('projectId') projectId?: string,
    @Query('period')    period: 'monthly' | 'weekly' = 'monthly',
  ) {
    return this.dashboardService.getActivityData(projectId, period);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'Get dynamic announcements filtered by project and month' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'month',     required: false, description: 'YYYY-MM' })
  getAnnouncements(
    @Query('projectId') projectId?: string,
    @Query('month')     month?: string,
  ): Promise<Announcement[]> {
    return this.dashboardService.getAnnouncements(projectId, month);
  }
}

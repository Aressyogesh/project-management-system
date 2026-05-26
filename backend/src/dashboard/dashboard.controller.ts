import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService, DashboardStats } from './dashboard.service';

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
  getStats(@CurrentUser() user: JwtUser): Promise<DashboardStats> {
    return this.dashboardService.getStats(user.sub, user.role);
  }
}

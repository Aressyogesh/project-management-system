import { Body, Controller, Get, Patch, Post, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsCronService } from './notifications-cron.service';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly svc: NotificationsService,
    private readonly cron: NotificationsCronService,
  ) {}

  @Get()
  getAll(@Request() req: any) {
    return this.svc.getForUser(req.user.id);
  }

  @Get('unread-count')
  unreadCount(@Request() req: any) {
    return this.svc.getUnreadCount(req.user.id).then((count) => ({ count }));
  }

  @Patch('read-all')
  markAllRead(@Request() req: any) {
    return this.svc.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: any) {
    return this.svc.markRead(id, req.user.id);
  }

  @Post('kpi-digest/send')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN, SystemRole.BU_HEAD)
  async sendKpiDigest(@Body() body: { period?: string; userIds?: string[] }) {
    const result = await this.cron.handleMonthlyKpiDigest(body?.period, body?.userIds);
    return { message: `Monthly Performance Scorecard sent to ${result.sent} user(s) for period ${result.period}.` };
  }
}

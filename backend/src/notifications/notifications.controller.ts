import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

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
}

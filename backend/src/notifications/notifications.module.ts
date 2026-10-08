import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsCronService } from './notifications-cron.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, AnalyticsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsCronService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsCronService } from './notifications-cron.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsCronService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

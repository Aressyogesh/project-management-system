import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationModule } from '../automation-services/automation.module';
import { WorkItemsController } from './work-items.controller';
import { WorkItemsService } from './work-items.service';

@Module({
  imports: [PrismaModule, NotificationsModule, AutomationModule],
  controllers: [WorkItemsController],
  providers: [WorkItemsService],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}

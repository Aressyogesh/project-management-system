import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TimesheetEntriesController } from './timesheet-entries.controller';
import { TimesheetEntriesService } from './timesheet-entries.service';

@Module({
  imports: [PrismaModule],
  controllers: [TimesheetEntriesController],
  providers: [TimesheetEntriesService],
  exports: [TimesheetEntriesService],
})
export class TimesheetEntriesModule {}

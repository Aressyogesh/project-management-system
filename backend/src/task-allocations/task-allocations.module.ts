import { Module } from '@nestjs/common';
import { TaskAllocationsController } from './task-allocations.controller';
import { TaskAllocationsService } from './task-allocations.service';

@Module({
  controllers: [TaskAllocationsController],
  providers: [TaskAllocationsService],
})
export class TaskAllocationsModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskListsController } from './task-lists.controller';
import { TaskListsService } from './task-lists.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaskListsController],
  providers: [TaskListsService],
})
export class TaskListsModule {}

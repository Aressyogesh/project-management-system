import { Module } from '@nestjs/common';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [TasksService, ProjectRoleGuard],
})
export class TasksModule {}

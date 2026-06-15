import { Module } from '@nestjs/common';
import { TaskAttachmentsController } from './task-attachments.controller';
import { TaskAttachmentsService } from './task-attachments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaskAttachmentsController],
  providers: [TaskAttachmentsService],
})
export class TaskAttachmentsModule {}

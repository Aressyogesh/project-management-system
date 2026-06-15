import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';

const COMMENT_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  author: { select: { id: true, fullName: true } },
};

@Injectable()
export class TaskCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(taskId: string, dto: CreateTaskCommentDto, authorId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.taskComment.create({
      data: { taskId, content: dto.content, authorId },
      select: COMMENT_SELECT,
    });
  }

  findAll(taskId: string) {
    return this.prisma.taskComment.findMany({
      where: { taskId },
      select: COMMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(id: string, requestingUserId: string, requestingUserRole: SystemRole) {
    const comment = await this.prisma.taskComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (
      comment.authorId !== requestingUserId &&
      requestingUserRole !== SystemRole.SUPER_USER &&
      requestingUserRole !== SystemRole.ADMIN
    ) {
      throw new ForbiddenException('Cannot delete another user\'s comment');
    }
    await this.prisma.taskComment.delete({ where: { id } });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TaskCommentsService } from './task-comments.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class TaskCommentsController {
  constructor(private readonly service: TaskCommentsService) {}

  @Get('tasks/:taskId/comments')
  listByTask(@Param('taskId') taskId: string) {
    return this.service.findAll(taskId);
  }

  @Post('tasks/:taskId/comments')
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskCommentDto,
    @Request() req: any,
  ) {
    return this.service.create(taskId, dto, req.user.id);
  }

  @Delete('comments/:id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user.id, req.user.systemRole);
  }
}

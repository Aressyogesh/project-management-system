import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTaskListDto, UpdateTaskListDto } from './dto/task-list.dto';
import { TaskListsService } from './task-lists.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class TaskListsController {
  constructor(private readonly taskListsService: TaskListsService) {}

  @Get('projects/:projectId/task-lists')
  findAll(@Param('projectId') projectId: string) {
    return this.taskListsService.findAll(projectId);
  }

  @Post('projects/:projectId/task-lists')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskListDto,
  ) {
    return this.taskListsService.create(projectId, dto);
  }

  @Patch('task-lists/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTaskListDto) {
    return this.taskListsService.update(id, dto);
  }

  @Delete('task-lists/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.taskListsService.remove(id);
  }
}

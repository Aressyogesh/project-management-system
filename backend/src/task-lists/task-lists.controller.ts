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
import { ProjectRole } from '@prisma/client';
import { ProjectIdFrom, ProjectRoles } from '../common/decorators/project-roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
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
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('param')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskListDto,
  ) {
    return this.taskListsService.create(projectId, dto);
  }

  @Patch('task-lists/:id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('taskList')
  update(@Param('id') id: string, @Body() dto: UpdateTaskListDto) {
    return this.taskListsService.update(id, dto);
  }

  @Delete('task-lists/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('taskList')
  remove(@Param('id') id: string) {
    return this.taskListsService.remove(id);
  }
}

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
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { ProjectIdFrom, ProjectRoles } from '../common/decorators/project-roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:projectId/tasks')
  findAll(@Param('projectId') projectId: string) {
    return this.tasksService.findAll(projectId);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post('projects/:projectId/tasks')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('param')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @Request() req: any,
  ) {
    return this.tasksService.create(projectId, dto, req.user.id);
  }

  @Patch('tasks/:id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('task')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('task')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}

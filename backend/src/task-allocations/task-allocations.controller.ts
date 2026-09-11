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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import {
  ProjectIdFrom,
  ProjectRoles,
} from '../common/decorators/project-roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import {
  CreateTaskAllocationDto,
  UpdateTaskAllocationDto,
} from './dto/task-allocation.dto';
import { TaskAllocationsService } from './task-allocations.service';

const WRITE_ROLES = [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD];

@ApiTags('Task Allocations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller()
export class TaskAllocationsController {
  constructor(private readonly service: TaskAllocationsService) {}

  @Post('projects/:projectId/task-allocations')
  @ProjectRoles(...WRITE_ROLES)
  @ProjectIdFrom('param')
  create(@Body() dto: CreateTaskAllocationDto) {
    return this.service.create(dto);
  }

  @Patch('task-allocations/:id')
  @ProjectRoles(...WRITE_ROLES)
  @ProjectIdFrom('allocation')
  update(@Param('id') id: string, @Body() dto: UpdateTaskAllocationDto) {
    return this.service.update(id, dto);
  }

  @Delete('task-allocations/:id')
  @ProjectRoles(...WRITE_ROLES)
  @ProjectIdFrom('allocation')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('task-allocations/check')
  check(@Query('userId') userId: string, @Query('date') date: string) {
    return this.service.check(userId, date);
  }

  @Get('task-allocations/user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findByUser(userId, from, to);
  }

  @Get('projects/:projectId/task-allocations')
  findByProject(@Param('projectId') projectId: string) {
    return this.service.findByProject(projectId);
  }
}

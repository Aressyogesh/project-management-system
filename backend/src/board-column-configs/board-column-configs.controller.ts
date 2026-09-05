import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { ProjectIdFrom, ProjectRoles } from '../common/decorators/project-roles.decorator';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { BoardColumnConfigsService, ColumnConfigDto } from './board-column-configs.service';

@Controller('board-column-configs')
export class BoardColumnConfigsController {
  constructor(private readonly service: BoardColumnConfigsService) {}

  @Get(':projectId')
  getByProject(@Param('projectId') projectId: string) {
    return this.service.getByProject(projectId);
  }

  @Put(':projectId')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('param')
  upsertMany(@Param('projectId') projectId: string, @Body() configs: ColumnConfigDto[]) {
    return this.service.upsertMany(projectId, configs);
  }
}

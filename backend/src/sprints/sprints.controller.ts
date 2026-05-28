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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectIdFrom, ProjectRoles } from '../common/decorators/project-roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { CreateSprintDto, UpdateSprintDto } from './dto/sprint.dto';
import { SprintsService } from './sprints.service';

@ApiTags('sprints')
@UseGuards(JwtAuthGuard)
@Controller()
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get('projects/:projectId/sprints')
  @ApiOperation({ summary: 'List sprints for a project' })
  findAll(@Param('projectId') projectId: string) {
    return this.sprintsService.findByProject(projectId);
  }

  @Post('projects/:projectId/sprints')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('param')
  @ApiOperation({ summary: 'Create sprint' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateSprintDto) {
    return this.sprintsService.create(projectId, dto);
  }

  @Patch('sprints/:id/activate')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('sprint')
  @ApiOperation({ summary: 'Activate a sprint (deactivates others in project)' })
  activate(@Param('id') id: string, @Body('projectId') projectId: string) {
    return this.sprintsService.setActive(id, projectId);
  }

  @Patch('sprints/:id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('sprint')
  @ApiOperation({ summary: 'Update sprint' })
  update(@Param('id') id: string, @Body() dto: UpdateSprintDto) {
    return this.sprintsService.update(id, dto);
  }

  @Delete('sprints/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('sprint')
  @ApiOperation({ summary: 'Delete sprint' })
  remove(@Param('id') id: string) {
    return this.sprintsService.remove(id);
  }
}

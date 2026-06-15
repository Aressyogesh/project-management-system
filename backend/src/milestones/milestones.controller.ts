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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { ProjectIdFrom, ProjectRoles } from '../common/decorators/project-roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { MilestonesService } from './milestones.service';

@ApiTags('Milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Get('projects/:projectId/milestones')
  findAll(@Param('projectId') projectId: string) {
    return this.service.findAll(projectId);
  }

  @Post('projects/:projectId/milestones')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER)
  @ProjectIdFrom('param')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.service.create(projectId, dto);
  }

  @Patch('milestones/:id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER)
  @ProjectIdFrom('milestone')
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.service.update(id, dto);
  }

  @Delete('milestones/:id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER)
  @ProjectIdFrom('milestone')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

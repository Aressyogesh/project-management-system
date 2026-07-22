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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { ProjectIdFrom, ProjectRoles } from '../common/decorators/project-roles.decorator';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { AddMemberDto, UpdateMemberDto } from './dto/project-member.dto';
import { ProjectMembersService } from './project-members.service';

@ApiTags('Project Members')
@ApiBearerAuth()
@Controller('projects/:projectId/members')
export class ProjectMembersController {
  constructor(private readonly service: ProjectMembersService) {}

  @Get()
  listMembers(@Param('projectId') projectId: string) {
    return this.service.listMembers(projectId);
  }

  @Post()
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER)
  @ProjectIdFrom('param')
  addMember(
    @Param('projectId') projectId: string,
    @Body() dto: AddMemberDto,
    @Request() req: any,
  ) {
    return this.service.addMember(projectId, dto.userId, dto.projectRole, req.user.id);
  }

  @Patch(':userId')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER)
  @ProjectIdFrom('param')
  updateMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
    @Request() req: any,
  ) {
    return this.service.updateMember(projectId, userId, dto, req.user.id);
  }

  @Delete(':userId')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER)
  @ProjectIdFrom('param')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.service.removeMember(projectId, userId, req.user.id);
  }
}

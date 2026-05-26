import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectStatus, SystemRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateProjectDto, ProjectsQueryDto, SetProjectStatusDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List projects with optional filters' })
  findAll(@Query() query: ProjectsQueryDto) {
    return this.projectsService.findAll(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Project summary counts' })
  getSummary() {
    return this.projectsService.getSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create a project' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update project details' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Set project status (ACTIVE / ARCHIVE / ON_HOLD)' })
  setStatus(@Param('id') id: string, @Body() dto: SetProjectStatusDto) {
    return this.projectsService.setStatus(id, dto.status);
  }
}

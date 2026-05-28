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
  Request,
  UseGuards,
} from '@nestjs/common';
import { BoardStatus, ProjectRole, TaskPriority, WorkItemType } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectIdFrom, ProjectRoles } from '../common/decorators/project-roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { CreateWorkItemDto, MoveWorkItemDto, UpdateWorkItemDto } from './dto/work-item.dto';
import { WorkItemsService } from './work-items.service';

@ApiTags('work-items')
@UseGuards(JwtAuthGuard)
@Controller()
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Get('projects/:projectId/work-items')
  @ApiOperation({ summary: 'Get board work items with filters' })
  findAll(
    @Param('projectId') projectId: string,
    @Query('type') type?: WorkItemType,
    @Query('sprintId') sprintId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: BoardStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('search') search?: string,
  ) {
    return this.workItemsService.findByProject(projectId, { type, sprintId, assigneeId, status, priority, search });
  }

  @Get('work-items/:id')
  @ApiOperation({ summary: 'Get work item detail' })
  findOne(@Param('id') id: string) {
    return this.workItemsService.findOne(id);
  }

  @Post('projects/:projectId/work-items')
  @ApiOperation({ summary: 'Create work item' })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkItemDto,
    @Request() req: any,
  ) {
    return this.workItemsService.create(projectId, req.user.id, dto);
  }

  @Patch('work-items/:id')
  @ApiOperation({ summary: 'Update work item fields' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkItemDto, @Request() req: any) {
    return this.workItemsService.update(id, req.user.id, req.user.systemRole, req.user.projectRole ?? null, dto);
  }

  @Patch('work-items/:id/move')
  @ApiOperation({ summary: 'Move work item to new status/position' })
  move(@Param('id') id: string, @Body() dto: MoveWorkItemDto) {
    return this.workItemsService.move(id, dto);
  }

  @Delete('work-items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER)
  @ProjectIdFrom('workItem')
  @ApiOperation({ summary: 'Delete work item and children' })
  remove(@Param('id') id: string) {
    return this.workItemsService.remove(id);
  }

  @Post('work-items/:id/comments')
  @ApiOperation({ summary: 'Add comment to work item' })
  addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @Request() req: any,
  ) {
    return this.workItemsService.addComment(id, req.user.id, content);
  }

  @Delete('work-items/:workItemId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete comment' })
  removeComment(
    @Param('commentId') commentId: string,
    @Request() req: any,
  ) {
    return this.workItemsService.removeComment(commentId, req.user.id, req.user.systemRole);
  }
}

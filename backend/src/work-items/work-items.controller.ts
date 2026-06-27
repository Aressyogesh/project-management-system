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
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { BoardStatus, ProjectRole, TaskPriority, WorkItemType } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectIdFrom, ProjectRoles } from '../common/decorators/project-roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { CreateWorkItemDto, MoveWorkItemDto, UpdateWorkItemDto } from './dto/work-item.dto';
import { WorkItemsService } from './work-items.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png', 'image/jpeg', 'text/plain', 'video/mp4',
];

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
    @Query('milestoneId') milestoneId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: BoardStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('search') search?: string,
  ) {
    return this.workItemsService.findByProject(projectId, { type, sprintId, milestoneId, assigneeId, status, priority, search });
  }

  @Get('work-items/:id')
  @ApiOperation({ summary: 'Get work item detail' })
  findOne(@Param('id') id: string) {
    return this.workItemsService.findOne(id);
  }

  @Post('projects/:projectId/work-items')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER, ProjectRole.QA, ProjectRole.DESIGNER, ProjectRole.DEVOPS)
  @ProjectIdFrom('param')
  @ApiOperation({ summary: 'Create work item' })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkItemDto,
    @Request() req: any,
  ) {
    return this.workItemsService.create(projectId, req.user.id, dto);
  }

  @Patch('work-items/:id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER, ProjectRole.QA, ProjectRole.DESIGNER, ProjectRole.DEVOPS)
  @ProjectIdFrom('workItem')
  @ApiOperation({ summary: 'Update work item fields' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkItemDto, @Request() req: any) {
    return this.workItemsService.update(id, req.user.id, req.user.systemRole, req.user.projectRole ?? null, dto);
  }

  @Patch('work-items/:id/move')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER, ProjectRole.QA, ProjectRole.DESIGNER, ProjectRole.DEVOPS)
  @ProjectIdFrom('workItem')
  @ApiOperation({ summary: 'Move work item to new status/position' })
  move(@Param('id') id: string, @Body() dto: MoveWorkItemDto, @Request() req: any) {
    return this.workItemsService.move(id, req.user.id, dto);
  }

  @Delete('work-items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD)
  @ProjectIdFrom('workItem')
  @ApiOperation({ summary: 'Delete work item and children' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.workItemsService.remove(id, req.user.id);
  }

  @Post('work-items/:id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'attachments'),
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
        cb(allowed ? null : new Error('File type not allowed'), allowed);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.workItemsService.addAttachment(id, file, req.user.id);
  }

  @Get('work-items/attachments/:id/download')
  async downloadAttachment(@Param('id') id: string, @Res() res: Response) {
    const a = await this.workItemsService.getAttachment(id);
    res.download(join(process.cwd(), 'uploads', 'attachments', a.filename), a.originalName);
  }

  @Delete('work-items/attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAttachment(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.workItemsService.removeAttachment(id, req.user.id);
  }

  @Post('work-items/:id/comments')
  @ApiOperation({ summary: 'Add comment to work item' })
  addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @Body('mentions') mentions: string[],
    @Request() req: any,
  ) {
    return this.workItemsService.addComment(id, req.user.id, content, mentions ?? []);
  }

  @Get('work-items/:id/activities')
  @ApiOperation({ summary: 'Get activity log for a work item' })
  getActivities(@Param('id') id: string) {
    return this.workItemsService.getActivities(id);
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

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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateTimesheetEntryDto, RejectTimesheetEntryDto, UpdateTimesheetEntryDto } from './dto/timesheet-entry.dto';
import { TimesheetEntriesService } from './timesheet-entries.service';

@ApiTags('timesheet-entries')
@UseGuards(JwtAuthGuard)
@Controller()
export class TimesheetEntriesController {
  constructor(private readonly timesheetEntriesService: TimesheetEntriesService) {}

  @Post('work-items/:workItemId/timesheet-entries')
  @ApiOperation({ summary: 'Log time against a work item' })
  create(
    @Param('workItemId') workItemId: string,
    @Body() dto: CreateTimesheetEntryDto,
    @Request() req: any,
  ) {
    return this.timesheetEntriesService.create(workItemId, req.user.id, req.user.systemRole, dto);
  }

  @Get('work-items/:workItemId/timesheet-entries')
  @ApiOperation({ summary: 'List timesheet entries for a work item' })
  findAll(@Param('workItemId') workItemId: string) {
    return this.timesheetEntriesService.findByWorkItem(workItemId);
  }

  @Get('timesheet')
  @ApiOperation({ summary: 'Get my timesheet entries (admin can pass userId to see others)' })
  findMyEntries(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.timesheetEntriesService.findMyEntries(
      req.user.id,
      req.user.systemRole,
      req.user.projectRole ?? null,
      userId,
      from,
      to,
      projectId,
    );
  }

  @Patch('timesheet-entries/:id')
  @ApiOperation({ summary: 'Update a timesheet entry' })
  update(@Param('id') id: string, @Body() dto: UpdateTimesheetEntryDto, @Request() req: any) {
    return this.timesheetEntriesService.update(id, req.user.id, dto);
  }

  @Delete('timesheet-entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a timesheet entry' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.timesheetEntriesService.remove(id, req.user.id, req.user.systemRole);
  }

  @Patch('timesheet-entries/:id/submit')
  @ApiOperation({ summary: 'Submit a timesheet entry for approval' })
  submit(@Param('id') id: string, @Request() req: any) {
    return this.timesheetEntriesService.submit(id, req.user.id);
  }

  @Patch('timesheet-entries/:id/approve')
  @ApiOperation({ summary: 'Approve a submitted timesheet entry' })
  approve(@Param('id') id: string, @Request() req: any) {
    return this.timesheetEntriesService.approve(
      id,
      req.user.id,
      req.user.systemRole,
      req.user.projectRole ?? null,
    );
  }

  @Patch('timesheet-entries/:id/reject')
  @ApiOperation({ summary: 'Reject a submitted timesheet entry' })
  reject(@Param('id') id: string, @Body() dto: RejectTimesheetEntryDto, @Request() req: any) {
    return this.timesheetEntriesService.reject(
      id,
      req.user.id,
      req.user.systemRole,
      req.user.projectRole ?? null,
      dto,
    );
  }
}

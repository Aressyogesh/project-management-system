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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateTimesheetEntryDto, UpdateTimesheetEntryDto } from './dto/timesheet-entry.dto';
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
}

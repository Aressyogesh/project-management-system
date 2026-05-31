import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { SelfLogsService } from './self-logs.service';
import { SystemRole } from '@prisma/client';

interface AuthRequest {
  user: { id: string; systemRole: SystemRole };
}

@Controller()
export class SelfLogsController {
  constructor(private readonly selfLogsService: SelfLogsService) {}

  // ─── Leave Logs ───────────────────────────────────────────────────────────────

  @Post('leave-logs')
  createLeave(
    @Body() dto: { date: string; type: string; description?: string },
    @Request() req: AuthRequest,
  ) {
    return this.selfLogsService.createLeaveLog(req.user.id, dto);
  }

  @Get('leave-logs')
  findLeave(
    @Query('period') period: string | undefined,
    @Request() req: AuthRequest,
  ) {
    return this.selfLogsService.findLeaveLogs(req.user.id, period);
  }

  @Delete('leave-logs/:id')
  deleteLeave(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.selfLogsService.deleteLeaveLog(
      id,
      req.user.id,
      req.user.systemRole,
    );
  }

  // ─── Learning Logs ────────────────────────────────────────────────────────────

  @Post('learning-logs')
  createLearning(
    @Body() dto: { period: string; topic: string; hours: number; description?: string },
    @Request() req: AuthRequest,
  ) {
    return this.selfLogsService.createLearningLog(req.user.id, dto);
  }

  @Get('learning-logs')
  findLearning(
    @Query('period') period: string | undefined,
    @Request() req: AuthRequest,
  ) {
    return this.selfLogsService.findLearningLogs(req.user.id, period);
  }

  @Delete('learning-logs/:id')
  deleteLearning(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.selfLogsService.deleteLearningLog(
      id,
      req.user.id,
      req.user.systemRole,
    );
  }

  // ─── Innovation Logs ──────────────────────────────────────────────────────────

  @Post('innovation-logs')
  createInnovation(
    @Body() dto: { period: string; title: string; impact: string; type: string },
    @Request() req: AuthRequest,
  ) {
    return this.selfLogsService.createInnovationLog(req.user.id, dto);
  }

  @Get('innovation-logs')
  findInnovation(
    @Query('period') period: string | undefined,
    @Request() req: AuthRequest,
  ) {
    return this.selfLogsService.findInnovationLogs(req.user.id, period);
  }

  @Delete('innovation-logs/:id')
  deleteInnovation(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.selfLogsService.deleteInnovationLog(
      id,
      req.user.id,
      req.user.systemRole,
    );
  }
}

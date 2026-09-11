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
    @Body() dto: { period: string; topic: string; hours: number; description?: string; targetUserId?: string },
    @Request() req: AuthRequest,
  ) {
    const isPrivileged = req.user.systemRole === SystemRole.ADMIN || req.user.systemRole === SystemRole.SUPER_USER;
    const userId = isPrivileged && dto.targetUserId ? dto.targetUserId : req.user.id;
    return this.selfLogsService.createLearningLog(userId, dto);
  }

  @Get('learning-logs')
  async findLearning(
    @Query('period') period: string | undefined,
    @Query('targetUserId') targetUserId: string | undefined,
    @Request() req: AuthRequest,
  ) {
    const isPrivileged = req.user.systemRole === SystemRole.ADMIN || req.user.systemRole === SystemRole.SUPER_USER;
    let userId = req.user.id;
    if (targetUserId && targetUserId !== req.user.id) {
      if (isPrivileged || await this.selfLogsService.canViewUserLogs(req.user.id, targetUserId)) {
        userId = targetUserId;
      }
    }
    return this.selfLogsService.findLearningLogs(userId, period);
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
    @Body() dto: { period: string; title: string; impact: string; type: string; targetUserId?: string },
    @Request() req: AuthRequest,
  ) {
    const isPrivileged = req.user.systemRole === SystemRole.ADMIN || req.user.systemRole === SystemRole.SUPER_USER;
    const userId = isPrivileged && dto.targetUserId ? dto.targetUserId : req.user.id;
    return this.selfLogsService.createInnovationLog(userId, dto);
  }

  @Get('innovation-logs')
  async findInnovation(
    @Query('period') period: string | undefined,
    @Query('targetUserId') targetUserId: string | undefined,
    @Request() req: AuthRequest,
  ) {
    const isPrivileged = req.user.systemRole === SystemRole.ADMIN || req.user.systemRole === SystemRole.SUPER_USER;
    let userId = req.user.id;
    if (targetUserId && targetUserId !== req.user.id) {
      if (isPrivileged || await this.selfLogsService.canViewUserLogs(req.user.id, targetUserId)) {
        userId = targetUserId;
      }
    }
    return this.selfLogsService.findInnovationLogs(userId, period);
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

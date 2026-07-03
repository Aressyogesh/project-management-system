import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeaveStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApproveLeaveRequestDto, CreateLeaveRequestDto, RejectLeaveRequestDto } from './dto/leave-request.dto';
import { LeaveRequestsService } from './leave-requests.service';

@ApiTags('leave-requests')
@UseGuards(JwtAuthGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Get('members')
  @ApiOperation({ summary: 'List team members the requester can record leaves for' })
  getManageableMembers(@Request() req: any) {
    return this.leaveRequestsService.getManageableMembers(req.user.id, req.user.systemRole, req.user.managedBusinessUnitId);
  }

  @Post()
  @ApiOperation({ summary: 'Record a leave for a team member (PM/Admin/BU_HEAD/SuperAdmin only)' })
  create(@Body() dto: CreateLeaveRequestDto, @Request() req: any) {
    return this.leaveRequestsService.create(req.user.id, req.user.systemRole, dto, req.user.managedBusinessUnitId);
  }

  @Get()
  @ApiOperation({ summary: 'List leave requests' })
  findAll(
    @Request() req: any,
    @Query('status') status?: LeaveStatus,
    @Query('userId') userId?: string,
  ) {
    return this.leaveRequestsService.findAll(req.user.id, req.user.systemRole, {
      status,
      userId,
    }, req.user.managedBusinessUnitId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single leave request' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.leaveRequestsService.findOne(id, req.user.id, req.user.systemRole);
  }

  @Patch(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a leave request (admin / BU_HEAD for own BU)' })
  approve(@Param('id') id: string, @Body() dto: ApproveLeaveRequestDto, @Request() req: any) {
    return this.leaveRequestsService.approve(id, req.user.id, req.user.systemRole, dto, req.user.managedBusinessUnitId);
  }

  @Patch(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a leave request (admin / BU_HEAD for own BU)' })
  reject(@Param('id') id: string, @Body() dto: RejectLeaveRequestDto, @Request() req: any) {
    return this.leaveRequestsService.reject(id, req.user.id, req.user.systemRole, dto, req.user.managedBusinessUnitId);
  }

  @Patch(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a leave request (own PENDING, or admin any)' })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.leaveRequestsService.cancel(id, req.user.id, req.user.systemRole);
  }
}

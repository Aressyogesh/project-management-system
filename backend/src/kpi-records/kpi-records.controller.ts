import { Body, Controller, Get, Post, Query, Request } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { KpiRecordsService, UpsertKpiRecordDto } from './kpi-records.service';

@Controller('kpi-records')
export class KpiRecordsController {
  constructor(private readonly kpiRecordsService: KpiRecordsService) {}

  @Post()
  @Roles(SystemRole.ADMIN, SystemRole.SUPER_USER)
  upsert(
    @Body() dto: UpsertKpiRecordDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.kpiRecordsService.upsert(dto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('period') period?: string,
  ) {
    return this.kpiRecordsService.findAll(userId, period);
  }
}

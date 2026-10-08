import { Module } from '@nestjs/common';
import { KpiRecordsController } from './kpi-records.controller';
import { KpiRecordsService } from './kpi-records.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KpiRecordsController],
  providers: [KpiRecordsService],
})
export class KpiRecordsModule {}

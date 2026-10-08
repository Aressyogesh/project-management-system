import { Module } from '@nestjs/common';
import { SelfLogsController } from './self-logs.controller';
import { SelfLogsService } from './self-logs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SelfLogsController],
  providers: [SelfLogsService],
})
export class SelfLogsModule {}

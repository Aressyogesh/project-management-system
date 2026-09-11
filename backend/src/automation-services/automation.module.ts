import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AutomationService } from './automation.service';

@Module({
  imports: [PrismaModule],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}

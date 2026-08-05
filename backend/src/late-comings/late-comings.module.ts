import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LateComingsController } from './late-comings.controller';
import { LateComingsService } from './late-comings.service';

@Module({
  imports: [PrismaModule],
  controllers: [LateComingsController],
  providers: [LateComingsService],
})
export class LateComingsModule {}

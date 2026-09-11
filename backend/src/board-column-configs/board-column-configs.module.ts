import { Module } from '@nestjs/common';
import { BoardColumnConfigsController } from './board-column-configs.controller';
import { BoardColumnConfigsService } from './board-column-configs.service';

@Module({
  controllers: [BoardColumnConfigsController],
  providers: [BoardColumnConfigsService],
})
export class BoardColumnConfigsModule {}

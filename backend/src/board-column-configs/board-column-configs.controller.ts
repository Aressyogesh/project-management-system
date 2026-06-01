import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { BoardColumnConfigsService, ColumnConfigDto } from './board-column-configs.service';

@Controller('board-column-configs')
export class BoardColumnConfigsController {
  constructor(private readonly service: BoardColumnConfigsService) {}

  @Get(':projectId')
  getByProject(@Param('projectId') projectId: string) {
    return this.service.getByProject(projectId);
  }

  @Put(':projectId')
  upsertMany(@Param('projectId') projectId: string, @Body() configs: ColumnConfigDto[]) {
    return this.service.upsertMany(projectId, configs);
  }
}

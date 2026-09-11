import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LateComingsService } from './late-comings.service';
import { CreateLateComingDto } from './dto/late-coming.dto';

@Controller('late-comings')
export class LateComingsController {
  constructor(private readonly service: LateComingsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateLateComingDto) {
    return this.service.create(user.id, user.systemRole, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query('userId') userId?: string) {
    return this.service.findAll(user.id, user.systemRole, { userId }, user.managedBuId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(id, user.id, user.systemRole);
  }
}

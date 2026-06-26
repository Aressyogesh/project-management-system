import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create a new announcement (Admin/SuperUser only)' })
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.announcementsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List announcements (all authenticated users)' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('latest') latest?: string,
  ) {
    return this.announcementsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      latest: latest === 'true',
    });
  }

  @Delete(':id')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an announcement (Admin/SuperUser only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.announcementsService.remove(id);
  }
}

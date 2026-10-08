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
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create announcement (Admin/SuperUser/PM)' })
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: { id: string; systemRole: SystemRole },
  ) {
    return this.announcementsService.create(dto, user.id, user.systemRole);
  }

  @Get()
  @ApiOperation({ summary: 'List announcements' })
  findAll(
    @CurrentUser() user: { id: string; systemRole: SystemRole },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('latest') latest?: string,
  ) {
    if (latest === 'true') {
      return this.announcementsService.findLatestForWidget(user.id);
    }
    return this.announcementsService.findAll(
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
      user.id,
      user.systemRole,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete announcement (Admin/SuperUser/PM-own)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; systemRole: SystemRole },
  ) {
    return this.announcementsService.remove(id, user.id, user.systemRole);
  }
}

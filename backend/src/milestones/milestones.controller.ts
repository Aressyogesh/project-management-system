import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { MilestonesService } from './milestones.service';

@ApiTags('Milestones')
@ApiBearerAuth()
@Controller()
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Get('projects/:projectId/milestones')
  findAll(@Param('projectId') projectId: string) {
    return this.service.findAll(projectId);
  }

  @Post('projects/:projectId/milestones')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.service.create(projectId, dto);
  }

  @Patch('milestones/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.service.update(id, dto);
  }

  @Delete('milestones/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

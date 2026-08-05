import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto, SetClientStatusDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN, SystemRole.BU_HEAD)
  @ApiOperation({ summary: 'List clients' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.clientsService.findAll(includeInactive === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Create a client' })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: { id: string }) {
    return this.clientsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client details' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: { id: string }) {
    return this.clientsService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Toggle client active/inactive' })
  setStatus(@Param('id') id: string, @Body() dto: SetClientStatusDto, @CurrentUser() user: { id: string }) {
    return this.clientsService.setStatus(id, dto.isActive, user.id);
  }
}

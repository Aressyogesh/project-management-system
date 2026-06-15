import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
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
  @ApiOperation({ summary: 'List clients' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.clientsService.findAll(includeInactive === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Create a client' })
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client details' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Toggle client active/inactive' })
  setStatus(@Param('id') id: string, @Body() dto: SetClientStatusDto) {
    return this.clientsService.setStatus(id, dto.isActive);
  }
}

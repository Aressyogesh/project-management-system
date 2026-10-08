import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { BusinessUnitsService } from './business-units.service';
import { CreateBusinessUnitDto, SetBusinessUnitStatusDto, UpdateBusinessUnitDto } from './dto/business-unit.dto';

@ApiTags('Business Units')
@ApiBearerAuth()
@Controller('business-units')
export class BusinessUnitsController {
  constructor(private businessUnitsService: BusinessUnitsService) {}

  @Get()
  @ApiOperation({ summary: 'List business units' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.businessUnitsService.findAll(includeInactive === 'true');
  }

  @Post()
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create a business unit' })
  create(@Body() dto: CreateBusinessUnitDto) {
    return this.businessUnitsService.create(dto);
  }

  @Patch(':id')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update a business unit' })
  update(@Param('id') id: string, @Body() dto: UpdateBusinessUnitDto) {
    return this.businessUnitsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Toggle business unit active/inactive' })
  setStatus(@Param('id') id: string, @Body() dto: SetBusinessUnitStatusDto) {
    return this.businessUnitsService.setStatus(id, dto.isActive);
  }
}

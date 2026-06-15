import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, SetDepartmentStatusDto, UpdateDepartmentDto } from './dto/department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
@Controller('departments')
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List departments' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.departmentsService.findAll(includeInactive === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Create a department' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update department name' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Toggle department active/inactive' })
  setStatus(@Param('id') id: string, @Body() dto: SetDepartmentStatusDto) {
    return this.departmentsService.setStatus(id, dto.isActive);
  }
}

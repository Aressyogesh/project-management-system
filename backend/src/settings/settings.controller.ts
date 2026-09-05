import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CompanySettingsDto,
  CreateHolidayDto,
  CreateShiftDto,
  PortalConfigDto,
  SettingsService,
  UpdateShiftDto,
} from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  /* ─── Company Settings ───────────────────────────────────────────── */

  @Get('company')
  @ApiOperation({ summary: 'Get company settings' })
  getCompany(): Promise<CompanySettingsDto> {
    return this.settingsService.getCompanySettings();
  }

  @Put('company')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update company settings' })
  updateCompany(@Body() dto: Partial<CompanySettingsDto>): Promise<CompanySettingsDto> {
    return this.settingsService.updateCompanySettings(dto);
  }

  /* ─── Portal Config ──────────────────────────────────────────────── */

  @Get('portal')
  @ApiOperation({ summary: 'Get portal configuration' })
  getPortal(): Promise<PortalConfigDto> {
    return this.settingsService.getPortalConfig();
  }

  @Put('portal')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update portal configuration' })
  updatePortal(@Body() dto: Partial<PortalConfigDto>): Promise<PortalConfigDto> {
    return this.settingsService.updatePortalConfig(dto);
  }

  /* ─── User Settings ──────────────────────────────────────────────── */

  @Get('users')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'List all users for settings panel' })
  getUsers() {
    return this.settingsService.getUsers();
  }

  @Put('users/:id/role')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update a user\'s system role' })
  updateRole(@Param('id') id: string, @Body() body: { systemRole: string }) {
    return this.settingsService.updateUserRole(id, body.systemRole);
  }

  @Delete('users/:id')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate a user' })
  deleteUser(@Param('id') id: string) {
    return this.settingsService.deleteUser(id);
  }

  /* ─── Shifts ─────────────────────────────────────────────────────── */

  @Get('shifts')
  @ApiOperation({ summary: 'List all shifts' })
  getShifts() {
    return this.settingsService.getShifts();
  }

  @Post('shifts')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create a shift' })
  createShift(@Body() dto: CreateShiftDto) {
    return this.settingsService.createShift(dto);
  }

  @Put('shifts/:id')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update a shift' })
  updateShift(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.settingsService.updateShift(id, dto);
  }

  @Delete('shifts/:id')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a custom shift' })
  deleteShift(@Param('id') id: string) {
    return this.settingsService.deleteShift(id);
  }

  /* ─── Holidays ───────────────────────────────────────────────────── */

  @Get('holidays')
  @ApiOperation({ summary: 'List holidays (optional ?year=YYYY)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  getHolidays(@Query('year') year?: string) {
    return this.settingsService.getHolidays(year ? parseInt(year, 10) : undefined);
  }

  @Post('holidays')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create a holiday' })
  createHoliday(@Body() dto: CreateHolidayDto) {
    return this.settingsService.createHoliday(dto);
  }

  @Delete('holidays/:id')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a holiday' })
  deleteHoliday(@Param('id') id: string) {
    return this.settingsService.deleteHoliday(id);
  }

  /* ─── Feature Visibility ─────────────────────────────────────────────── */

  @Get('feature-visibility')
  @ApiOperation({ summary: 'Get feature visibility settings (all roles)' })
  getFeatureVisibility() {
    return this.settingsService.getFeatureVisibility();
  }

  @Patch('feature-visibility')
  @Roles(SystemRole.SUPER_USER)
  @ApiOperation({ summary: 'Update a feature visibility toggle (SUPER_USER only)' })
  updateFeatureVisibility(
    @Body() body: { feature: string; role: string; visible: boolean },
  ) {
    return this.settingsService.updateFeatureVisibility(body.feature, body.role, body.visible);
  }
}

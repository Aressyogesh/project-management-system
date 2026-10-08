import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShiftType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CompanySettingsDto {
  companyName: string;
  webAddress?: string;
  street?: string;
  city?: string;
  state?: string;
  country: string;
  zipCode?: string;
  timezone: string;
  backDateLogValue: number;
  backDateLogUnit: 'Days' | 'Weeks' | 'Months';
  emailDomains: string[];
}

export interface CreateShiftDto {
  name: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  workHours?: number;
}

export interface UpdateShiftDto {
  name?: string;
  startTime?: string;
  endTime?: string;
  workHours?: number;
  isActive?: boolean;
}

export interface CreateHolidayDto {
  name: string;
  date: string;
  isRecurring?: boolean;
}

export interface WorkingDays {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface PortalConfigDto {
  dateFormat: string;
  timeFormat: '12' | '24';
  taskDurationIn: 'days' | 'hours';
  firstDayOfWeek: 'Sunday' | 'Monday';
  businessHoursStart: string;
  businessHoursStartPeriod: 'AM' | 'PM';
  businessHoursEnd: string;
  businessHoursEndPeriod: 'AM' | 'PM';
  workingDays: WorkingDays;
}

const SINGLETON_ID = 'singleton';

const DEFAULT_WORKING_DAYS: WorkingDays = {
  monday: true, tuesday: true, wednesday: true,
  thursday: true, friday: true, saturday: false, sunday: false,
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getCompanySettings(): Promise<CompanySettingsDto> {
    const record = await this.prisma.companySettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: {
        id: SINGLETON_ID,
        companyName: '',
        country: 'India',
        timezone: 'Asia/Kolkata',
        backDateLogValue: 8,
        backDateLogUnit: 'Days',
        emailDomains: [],
      },
    });

    return {
      companyName: record.companyName,
      webAddress: record.webAddress ?? undefined,
      street: record.street ?? undefined,
      city: record.city ?? undefined,
      state: record.state ?? undefined,
      country: record.country,
      zipCode: record.zipCode ?? undefined,
      timezone: record.timezone,
      backDateLogValue: record.backDateLogValue,
      backDateLogUnit: record.backDateLogUnit as CompanySettingsDto['backDateLogUnit'],
      emailDomains: record.emailDomains,
    };
  }

  async updateCompanySettings(dto: Partial<CompanySettingsDto>): Promise<CompanySettingsDto> {
    const record = await this.prisma.companySettings.upsert({
      where: { id: SINGLETON_ID },
      update: { ...dto },
      create: {
        id: SINGLETON_ID,
        companyName: dto.companyName ?? '',
        country: dto.country ?? 'India',
        timezone: dto.timezone ?? 'Asia/Kolkata',
        backDateLogValue: dto.backDateLogValue ?? 8,
        backDateLogUnit: dto.backDateLogUnit ?? 'Days',
        emailDomains: dto.emailDomains ?? [],
        webAddress: dto.webAddress,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
      },
    });

    return {
      companyName: record.companyName,
      webAddress: record.webAddress ?? undefined,
      street: record.street ?? undefined,
      city: record.city ?? undefined,
      state: record.state ?? undefined,
      country: record.country,
      zipCode: record.zipCode ?? undefined,
      timezone: record.timezone,
      backDateLogValue: record.backDateLogValue,
      backDateLogUnit: record.backDateLogUnit as CompanySettingsDto['backDateLogUnit'],
      emailDomains: record.emailDomains,
    };
  }

  async getPortalConfig(): Promise<PortalConfigDto> {
    const record = await this.prisma.portalConfig.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: {
        id: SINGLETON_ID,
        dateFormat: 'DD-MM-YYYY',
        timeFormat: '24',
        taskDurationIn: 'hours',
        firstDayOfWeek: 'Monday',
        businessHoursStart: '10:00',
        businessHoursStartPeriod: 'AM',
        businessHoursEnd: '07:00',
        businessHoursEndPeriod: 'PM',
        workingDays: DEFAULT_WORKING_DAYS as object,
      },
    });

    return {
      dateFormat: record.dateFormat,
      timeFormat: record.timeFormat as PortalConfigDto['timeFormat'],
      taskDurationIn: record.taskDurationIn as PortalConfigDto['taskDurationIn'],
      firstDayOfWeek: record.firstDayOfWeek as PortalConfigDto['firstDayOfWeek'],
      businessHoursStart: record.businessHoursStart,
      businessHoursStartPeriod: record.businessHoursStartPeriod as 'AM' | 'PM',
      businessHoursEnd: record.businessHoursEnd,
      businessHoursEndPeriod: record.businessHoursEndPeriod as 'AM' | 'PM',
      workingDays: record.workingDays as unknown as WorkingDays,
    };
  }

  async updatePortalConfig(dto: Partial<PortalConfigDto>): Promise<PortalConfigDto> {
    const record = await this.prisma.portalConfig.upsert({
      where: { id: SINGLETON_ID },
      update: { ...dto, workingDays: dto.workingDays as object | undefined },
      create: {
        id: SINGLETON_ID,
        dateFormat: dto.dateFormat ?? 'DD-MM-YYYY',
        timeFormat: dto.timeFormat ?? '24',
        taskDurationIn: dto.taskDurationIn ?? 'hours',
        firstDayOfWeek: dto.firstDayOfWeek ?? 'Monday',
        businessHoursStart: dto.businessHoursStart ?? '10:00',
        businessHoursStartPeriod: dto.businessHoursStartPeriod ?? 'AM',
        businessHoursEnd: dto.businessHoursEnd ?? '07:00',
        businessHoursEndPeriod: dto.businessHoursEndPeriod ?? 'PM',
        workingDays: (dto.workingDays ?? DEFAULT_WORKING_DAYS) as object,
      },
    });

    return {
      dateFormat: record.dateFormat,
      timeFormat: record.timeFormat as PortalConfigDto['timeFormat'],
      taskDurationIn: record.taskDurationIn as PortalConfigDto['taskDurationIn'],
      firstDayOfWeek: record.firstDayOfWeek as PortalConfigDto['firstDayOfWeek'],
      businessHoursStart: record.businessHoursStart,
      businessHoursStartPeriod: record.businessHoursStartPeriod as 'AM' | 'PM',
      businessHoursEnd: record.businessHoursEnd,
      businessHoursEndPeriod: record.businessHoursEndPeriod as 'AM' | 'PM',
      workingDays: record.workingDays as unknown as WorkingDays,
    };
  }

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        systemRole: true,
        isActive: true,
        profilePhoto: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async updateUserRole(userId: string, systemRole: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { systemRole: systemRole as any },
      select: { id: true, fullName: true, email: true, systemRole: true, isActive: true },
    });
  }

  async deleteUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  /* ─── Shifts ──────────────────────────────────────────────────────── */

  async getShifts() {
    return this.prisma.shift.findMany({ orderBy: { shiftType: 'asc' } });
  }

  async createShift(dto: CreateShiftDto) {
    if (dto.shiftType !== ShiftType.CUSTOM) {
      const existing = await this.prisma.shift.findFirst({
        where: { shiftType: dto.shiftType },
      });
      if (existing) {
        throw new ConflictException(`Shift type ${dto.shiftType} already exists`);
      }
    }
    return this.prisma.shift.create({ data: { ...dto, workHours: dto.workHours ?? 8 } });
  }

  async updateShift(id: string, dto: UpdateShiftDto) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    return this.prisma.shift.update({ where: { id }, data: dto });
  }

  async deleteShift(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.shiftType !== ShiftType.CUSTOM) {
      throw new ConflictException('Only custom shifts can be deleted');
    }
    await this.prisma.shift.delete({ where: { id } });
  }

  /* ─── Holidays ────────────────────────────────────────────────────── */

  async getHolidays(year?: number) {
    const where = year
      ? {
          date: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`),
          },
        }
      : {};
    return this.prisma.holiday.findMany({ where, orderBy: { date: 'asc' } });
  }

  async createHoliday(dto: CreateHolidayDto) {
    const dateObj = new Date(dto.date);
    const existing = await this.prisma.holiday.findUnique({ where: { date: dateObj } });
    if (existing) throw new ConflictException('A holiday already exists on this date');
    return this.prisma.holiday.create({
      data: { name: dto.name, date: dateObj, isRecurring: dto.isRecurring ?? false },
    });
  }

  async deleteHoliday(id: string) {
    const holiday = await this.prisma.holiday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    await this.prisma.holiday.delete({ where: { id } });
  }

  /* ─── Feature Visibility ─────────────────────────────────────────────── */

  async getFeatureVisibility() {
    return this.prisma.featureVisibility.findMany({
      select: { feature: true, role: true, visible: true },
      orderBy: [{ feature: 'asc' }, { role: 'asc' }],
    });
  }

  async updateFeatureVisibility(feature: string, role: string, visible: boolean) {
    return this.prisma.featureVisibility.upsert({
      where: { feature_role: { feature, role } },
      update: { visible },
      create: { feature, role, visible },
      select: { feature: true, role: true, visible: true },
    });
  }
}

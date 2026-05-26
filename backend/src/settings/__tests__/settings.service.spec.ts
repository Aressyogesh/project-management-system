import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ShiftType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings.service';

// ─── Shift fixtures ────────────────────────────────────────────────────────────

const mockShift = {
  id: 'shift-uuid-1',
  name: 'Day',
  shiftType: ShiftType.DAY,
  startTime: '10:00',
  endTime: '19:00',
  workHours: 8,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Holiday fixtures ──────────────────────────────────────────────────────────

const mockHoliday = {
  id: 'holiday-uuid-1',
  name: 'Republic Day',
  date: new Date('2026-01-26'),
  isRecurring: true,
  createdAt: new Date(),
};

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockPrisma = {
  shift: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  holiday: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  companySettings: { upsert: jest.fn() },
  portalConfig: { upsert: jest.fn() },
  user: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  // ─── Shifts ─────────────────────────────────────────────────────────────────

  describe('getShifts', () => {
    it('getShifts_Called_ReturnsShiftArray', async () => {
      mockPrisma.shift.findMany.mockResolvedValue([mockShift]);

      const result = await service.getShifts();

      expect(result).toEqual([mockShift]);
      expect(mockPrisma.shift.findMany).toHaveBeenCalledTimes(1);
    });

    it('getShifts_EmptyTable_ReturnsEmptyArray', async () => {
      mockPrisma.shift.findMany.mockResolvedValue([]);

      const result = await service.getShifts();

      expect(result).toEqual([]);
    });
  });

  describe('createShift', () => {
    it('createShift_ValidInput_ReturnsNewShift', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null);
      mockPrisma.shift.create.mockResolvedValue(mockShift);

      const result = await service.createShift({
        name: 'Day',
        shiftType: ShiftType.DAY,
        startTime: '10:00',
        endTime: '19:00',
        workHours: 8,
      });

      expect(result).toEqual(mockShift);
      expect(mockPrisma.shift.create).toHaveBeenCalledTimes(1);
    });

    it('createShift_DuplicateShiftType_ThrowsConflictException', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(mockShift);

      await expect(
        service.createShift({ name: 'Day', shiftType: ShiftType.DAY, startTime: '10:00', endTime: '19:00' }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.shift.create).not.toHaveBeenCalled();
    });

    it('createShift_NoWorkHours_DefaultsToEight', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null);
      mockPrisma.shift.create.mockResolvedValue({ ...mockShift, workHours: 8 });

      await service.createShift({ name: 'Day', shiftType: ShiftType.DAY, startTime: '10:00', endTime: '19:00' });

      expect(mockPrisma.shift.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ workHours: 8 }) }),
      );
    });
  });

  describe('updateShift', () => {
    it('updateShift_ValidId_ReturnsUpdatedShift', async () => {
      const updated = { ...mockShift, startTime: '09:00' };
      mockPrisma.shift.findUnique.mockResolvedValue(mockShift);
      mockPrisma.shift.update.mockResolvedValue(updated);

      const result = await service.updateShift('shift-uuid-1', { startTime: '09:00' });

      expect(result.startTime).toBe('09:00');
      expect(mockPrisma.shift.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'shift-uuid-1' } }),
      );
    });

    it('updateShift_NotFound_ThrowsNotFoundException', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null);

      await expect(service.updateShift('bad-id', { startTime: '09:00' })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Holidays ───────────────────────────────────────────────────────────────

  describe('getHolidays', () => {
    it('getHolidays_NoYear_ReturnsAllHolidays', async () => {
      mockPrisma.holiday.findMany.mockResolvedValue([mockHoliday]);

      const result = await service.getHolidays();

      expect(result).toEqual([mockHoliday]);
      expect(mockPrisma.holiday.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('getHolidays_WithYear_FiltersToThatYear', async () => {
      mockPrisma.holiday.findMany.mockResolvedValue([mockHoliday]);

      await service.getHolidays(2026);

      expect(mockPrisma.holiday.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            }),
          }),
        }),
      );
    });
  });

  describe('createHoliday', () => {
    it('createHoliday_ValidInput_ReturnsNewHoliday', async () => {
      mockPrisma.holiday.findUnique.mockResolvedValue(null);
      mockPrisma.holiday.create.mockResolvedValue(mockHoliday);

      const result = await service.createHoliday({
        name: 'Republic Day',
        date: '2026-01-26',
        isRecurring: true,
      });

      expect(result).toEqual(mockHoliday);
      expect(mockPrisma.holiday.create).toHaveBeenCalledTimes(1);
    });

    it('createHoliday_DuplicateDate_ThrowsConflictException', async () => {
      mockPrisma.holiday.findUnique.mockResolvedValue(mockHoliday);

      await expect(
        service.createHoliday({ name: 'Another', date: '2026-01-26', isRecurring: false }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.holiday.create).not.toHaveBeenCalled();
    });

    it('createHoliday_NoIsRecurring_DefaultsToFalse', async () => {
      mockPrisma.holiday.findUnique.mockResolvedValue(null);
      mockPrisma.holiday.create.mockResolvedValue({ ...mockHoliday, isRecurring: false });

      await service.createHoliday({ name: 'Test', date: '2026-03-10' });

      expect(mockPrisma.holiday.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isRecurring: false }),
        }),
      );
    });
  });

  describe('deleteHoliday', () => {
    it('deleteHoliday_ValidId_DeletesRecord', async () => {
      mockPrisma.holiday.findUnique.mockResolvedValue(mockHoliday);
      mockPrisma.holiday.delete.mockResolvedValue(mockHoliday);

      await service.deleteHoliday('holiday-uuid-1');

      expect(mockPrisma.holiday.delete).toHaveBeenCalledWith({ where: { id: 'holiday-uuid-1' } });
    });

    it('deleteHoliday_NotFound_ThrowsNotFoundException', async () => {
      mockPrisma.holiday.findUnique.mockResolvedValue(null);

      await expect(service.deleteHoliday('bad-id')).rejects.toThrow(NotFoundException);

      expect(mockPrisma.holiday.delete).not.toHaveBeenCalled();
    });
  });
});

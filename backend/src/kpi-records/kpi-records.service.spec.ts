import { Test } from '@nestjs/testing';
import { KpiRecordsService } from './kpi-records.service';
import { PrismaService } from '../prisma/prisma.service';

describe('KpiRecordsService', () => {
  let service: KpiRecordsService;
  let prisma: { kpiRecord: { upsert: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      kpiRecord: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        KpiRecordsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(KpiRecordsService);
  });

  it('upsert calls prisma.kpiRecord.upsert with correct args', async () => {
    const dto = {
      userId: 'user-1',
      period: '2026-05',
      metricId: 'engineering_hygiene',
      points: 5,
    };
    prisma.kpiRecord.upsert.mockResolvedValue({ ...dto, id: 'rec-1', enteredById: 'admin-1' });

    await service.upsert(dto, 'admin-1');

    expect(prisma.kpiRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_period_metricId: { userId: 'user-1', period: '2026-05', metricId: 'engineering_hygiene' } },
        create: expect.objectContaining({ points: 5, enteredById: 'admin-1' }),
        update: expect.objectContaining({ points: 5, enteredById: 'admin-1' }),
      }),
    );
  });

  it('findAll with userId and period passes correct where clause', async () => {
    prisma.kpiRecord.findMany.mockResolvedValue([]);
    await service.findAll('user-1', '2026-05');
    expect(prisma.kpiRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', period: '2026-05' } }),
    );
  });
});

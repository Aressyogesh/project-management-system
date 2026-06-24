import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpskillService } from './upskill.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectRole, SystemRole, UpskillStatus, UpskillType } from '@prisma/client';

const mockAssignment = (overrides = {}) => ({
  id: 'asgn-001',
  type: UpskillType.LEARNING,
  assignedToId: 'user-001',
  createdById: 'mgr-001',
  description: 'Learn NestJS',
  toolScript: null,
  startDate: new Date('2026-06-01'),
  endDate: new Date('2026-06-30'),
  status: UpskillStatus.ASSIGNED,
  evidenceFilePath: null,
  evidenceFileName: null,
  rejectionReason: null,
  approvedAt: null,
  approvedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UpskillService', () => {
  let service: UpskillService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpskillService,
        {
          provide: PrismaService,
          useValue: {
            upskillAssignment: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
            upskillProgressLog: { create: jest.fn() },
            projectMember: { findFirst: jest.fn() },
            user: { findUnique: jest.fn() },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UpskillService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  // ─── UTC-F054-BE-01 ───────────────────────────────────────────────────────

  it('creates a LEARNING assignment successfully', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-001' });
    const created = mockAssignment();
    (prisma.upskillAssignment.create as jest.Mock).mockResolvedValue(created);

    const result = await service.createAssignment('mgr-001', {
      type: UpskillType.LEARNING,
      assignedToId: 'user-001',
      description: 'Learn NestJS',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });

    expect(result.id).toBe('asgn-001');
    expect(result.status).toBe(UpskillStatus.ASSIGNED);
    expect(prisma.upskillAssignment.create).toHaveBeenCalledTimes(1);
  });

  // ─── UTC-F054-BE-02 ───────────────────────────────────────────────────────

  it('throws BadRequestException when AUTOMATION type missing toolScript', async () => {
    await expect(
      service.createAssignment('mgr-001', {
        type: UpskillType.AUTOMATION,
        assignedToId: 'user-001',
        description: 'Automate regression',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.upskillAssignment.create).not.toHaveBeenCalled();
  });

  // ─── UTC-F054-BE-04 ───────────────────────────────────────────────────────

  it('throws BadRequestException when endDate is before startDate', async () => {
    await expect(
      service.createAssignment('mgr-001', {
        type: UpskillType.LEARNING,
        assignedToId: 'user-001',
        description: 'Learn NestJS',
        startDate: '2026-06-30',
        endDate: '2026-06-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ─── UTC-F054-BE-05 ───────────────────────────────────────────────────────

  it('logProgress transitions ASSIGNED to IN_PROGRESS', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment());
    const progressLog = { id: 'log-001', percentComplete: 30, hoursSpent: 2, notes: 'Started' };
    (prisma.$transaction as jest.Mock).mockResolvedValue([progressLog, mockAssignment({ status: UpskillStatus.IN_PROGRESS })]);

    const result = await service.logProgress('asgn-001', 'user-001', { percentComplete: 30, hoursSpent: 2, notes: 'Started' });

    expect(result.id).toBe('log-001');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  // ─── UTC-F054-BE-06 ───────────────────────────────────────────────────────

  it('logProgress throws ForbiddenException for non-assignee', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ assignedToId: 'user-001' }));

    await expect(service.logProgress('asgn-001', 'user-002', { percentComplete: 50, hoursSpent: 1 })).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ─── UTC-F054-BE-07 ───────────────────────────────────────────────────────

  it('logProgress throws ConflictException on APPROVED assignment', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ status: UpskillStatus.APPROVED }));

    await expect(service.logProgress('asgn-001', 'user-001', { percentComplete: 80, hoursSpent: 2 })).rejects.toThrow(ConflictException);
  });

  // ─── UTC-F054-BE-08 ───────────────────────────────────────────────────────

  it('submitEvidence transitions to SUBMITTED', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ status: UpskillStatus.IN_PROGRESS }));
    const updated = mockAssignment({ status: UpskillStatus.SUBMITTED, evidenceFilePath: 'uploads/upskill/cert.pdf', evidenceFileName: 'cert.pdf' });
    (prisma.upskillAssignment.update as jest.Mock).mockResolvedValue(updated);

    const result = await service.submitEvidence('asgn-001', 'user-001', 'uploads/upskill/cert.pdf', 'cert.pdf');

    expect(result.status).toBe(UpskillStatus.SUBMITTED);
    expect(prisma.upskillAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: UpskillStatus.SUBMITTED }) }),
    );
  });

  // ─── UTC-F054-BE-09 ───────────────────────────────────────────────────────

  it('submitEvidence throws ConflictException when already SUBMITTED', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ status: UpskillStatus.SUBMITTED }));

    await expect(service.submitEvidence('asgn-001', 'user-001', 'path', 'name')).rejects.toThrow(ConflictException);
  });

  // ─── UTC-F054-BE-10 ───────────────────────────────────────────────────────

  it('approveAssignment transitions to APPROVED', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ status: UpskillStatus.SUBMITTED }));
    const approved = mockAssignment({ status: UpskillStatus.APPROVED, approvedById: 'mgr-001', approvedAt: new Date() });
    (prisma.upskillAssignment.update as jest.Mock).mockResolvedValue(approved);

    const result = await service.approveAssignment('asgn-001', 'mgr-001', SystemRole.ADMIN);

    expect(result.status).toBe(UpskillStatus.APPROVED);
    expect(prisma.upskillAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: UpskillStatus.APPROVED, approvedById: 'mgr-001' }) }),
    );
  });

  // ─── UTC-F054-BE-11 ───────────────────────────────────────────────────────

  it('approveAssignment throws ConflictException when not SUBMITTED', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ status: UpskillStatus.ASSIGNED }));

    await expect(service.approveAssignment('asgn-001', 'mgr-001', SystemRole.ADMIN)).rejects.toThrow(ConflictException);
  });

  // ─── UTC-F054-BE-SEC-01 — IDOR: PM cannot approve another PM's assignment ──

  it('approveAssignment throws ForbiddenException when PM tries to approve assignment they did not create', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(
      mockAssignment({ status: UpskillStatus.SUBMITTED, createdById: 'other-pm' }),
    );

    await expect(service.approveAssignment('asgn-001', 'mgr-001', SystemRole.EMPLOYEE)).rejects.toThrow(ForbiddenException);
    expect(prisma.upskillAssignment.update).not.toHaveBeenCalled();
  });

  // ─── UTC-F054-BE-12 ───────────────────────────────────────────────────────

  it('rejectAssignment throws BadRequestException when reason is empty', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ status: UpskillStatus.SUBMITTED }));

    await expect(service.rejectAssignment('asgn-001', 'mgr-001', '', SystemRole.ADMIN)).rejects.toThrow(BadRequestException);
  });

  // ─── UTC-F054-BE-13 ───────────────────────────────────────────────────────

  it('rejectAssignment stores reason and transitions to REJECTED', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ status: UpskillStatus.SUBMITTED }));
    const rejected = mockAssignment({ status: UpskillStatus.REJECTED, rejectionReason: 'Certificate unclear' });
    (prisma.upskillAssignment.update as jest.Mock).mockResolvedValue(rejected);

    const result = await service.rejectAssignment('asgn-001', 'mgr-001', 'Certificate unclear', SystemRole.ADMIN);

    expect(result.status).toBe(UpskillStatus.REJECTED);
    expect(result.rejectionReason).toBe('Certificate unclear');
  });

  // ─── UTC-F054-BE-SEC-02 — IDOR: PM cannot reject another PM's assignment ───

  it('rejectAssignment throws ForbiddenException when PM tries to reject assignment they did not create', async () => {
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(
      mockAssignment({ status: UpskillStatus.SUBMITTED, createdById: 'other-pm' }),
    );

    await expect(service.rejectAssignment('asgn-001', 'mgr-001', 'not valid', SystemRole.EMPLOYEE)).rejects.toThrow(ForbiddenException);
    expect(prisma.upskillAssignment.update).not.toHaveBeenCalled();
  });

  // ─── UTC-F054-BE-14 ───────────────────────────────────────────────────────

  it('allows resubmit on REJECTED assignment within same month', async () => {
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), 28);
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ status: UpskillStatus.REJECTED, endDate }));
    const resubmitted = mockAssignment({ status: UpskillStatus.SUBMITTED, evidenceFilePath: 'new.pdf', rejectionReason: null });
    (prisma.upskillAssignment.update as jest.Mock).mockResolvedValue(resubmitted);

    const result = await service.submitEvidence('asgn-001', 'user-001', 'new.pdf', 'new.pdf');

    expect(result.status).toBe(UpskillStatus.SUBMITTED);
    expect(result.rejectionReason).toBeNull();
  });

  // ─── UTC-F054-BE-15 ───────────────────────────────────────────────────────

  it('blocks resubmit on REJECTED assignment after month end', async () => {
    const pastEnd = new Date('2026-05-31');
    (prisma.upskillAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment({ status: UpskillStatus.REJECTED, endDate: pastEnd }));

    await expect(service.submitEvidence('asgn-001', 'user-001', 'new.pdf', 'new.pdf')).rejects.toThrow(ForbiddenException);
  });

  // ─── UTC-F054-BE-03 — isManager check ────────────────────────────────────

  it('isManager returns true for ADMIN', async () => {
    const result = await service.isManager('any', SystemRole.ADMIN);
    expect(result).toBe(true);
  });

  it('isManager returns false for EMPLOYEE with no PM role', async () => {
    (prisma.projectMember.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await service.isManager('emp-001', SystemRole.EMPLOYEE);
    expect(result).toBe(false);
  });

  it('isManager returns true for EMPLOYEE with PROJECT_MANAGER role', async () => {
    (prisma.projectMember.findFirst as jest.Mock).mockResolvedValue({ id: 'pm-membership' });
    const result = await service.isManager('pm-user', SystemRole.EMPLOYEE);
    expect(result).toBe(true);
  });
});

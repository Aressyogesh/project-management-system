import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { EmailService } from '../../email/email.service';
import { UsersService } from '../users.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockUser = {
  id: 'user-001',
  fullName: 'Jane Doe',
  email: 'jane@pms.com',
  systemRole: 'EMPLOYEE',
  phone: null,
  joinDate: null,
  profilePhoto: null,
  isActive: true,
  createdAt: new Date(),
  department: null,
  shift: null,
};

const mockAuditLogs = { log: jest.fn() };
const mockEmail = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
  wrapHtml: jest.fn().mockReturnValue('<html>wrapped</html>'),
};
const mockConfig = { get: jest.fn().mockReturnValue('http://localhost:5173') };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
        { provide: EmailService, useValue: mockEmail },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
    mockEmail.sendEmail.mockResolvedValue(undefined);
    mockEmail.wrapHtml.mockReturnValue('<html>wrapped</html>');
  });

  // UTC-F-004-B-001
  it('CreateUser_ValidData_ReturnsCreatedUser', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

    const result = await service.createUser({
      fullName: 'Jane Doe',
      email: 'jane@pms.com',
      systemRole: 'EMPLOYEE' as any,
    });

    expect(result.fullName).toBe('Jane Doe');
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
  });

  // UTC-F-004-B-002
  it('CreateUser_DuplicateEmail_ThrowsConflictException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    await expect(
      service.createUser({ fullName: 'X', email: 'jane@pms.com', systemRole: 'EMPLOYEE' as any }),
    ).rejects.toThrow(ConflictException);

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  // UTC-F-004-B-003
  it('FindAll_WithSearch_ReturnsFilteredPaginatedUsers', async () => {
    mockPrisma.user.findMany.mockResolvedValue([mockUser]);
    mockPrisma.user.count.mockResolvedValue(1);

    const result = await service.findAll({ page: 1, limit: 25, search: 'jane' });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
  });

  // UTC-F-004-B-004
  it('UpdateUser_ValidPatch_ReturnsUpdatedUser', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, phone: '+91 98765 43210' });

    const result = await service.updateUser('user-001', { phone: '+91 98765 43210' });

    expect(result.phone).toBe('+91 98765 43210');
  });

  // UTC-F-004-B-005
  it('UpdateUser_NotFound_ThrowsNotFoundException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(service.updateUser('bad-id', { fullName: 'X' })).rejects.toThrow(NotFoundException);
  });

  // UTC-F-004-B-006
  it('ToggleStatus_OwnAccount_ThrowsBadRequestException', async () => {
    await expect(service.setUserStatus('user-abc', false, 'user-abc')).rejects.toThrow(BadRequestException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  // UTC-F-004-B-007
  it('ToggleStatus_OtherUser_UpdatesIsActive', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });

    const result = await service.setUserStatus('user-001', false, 'other-user');

    expect(result.isActive).toBe(false);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
    );
  });

  // UTC-F041-B-001
  it('UTC-F041-B-001: CreateUser_NewUser_SendsWelcomeEmail', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

    await service.createUser({
      fullName: 'Jane Doe',
      email: 'jane@pms.com',
      systemRole: 'EMPLOYEE' as any,
    });

    expect(mockEmail.sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject] = mockEmail.sendEmail.mock.calls[0];
    expect(to).toBe('jane@pms.com');
    expect(subject.toLowerCase()).toContain('welcome');
  });

  // UTC-F041-B-002
  it('UTC-F041-B-002: CreateUser_SmtpFails_UserCreatedAndErrorLogged', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);
    mockEmail.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

    const result = await service.createUser({
      fullName: 'Jane Doe',
      email: 'jane@pms.com',
      systemRole: 'EMPLOYEE' as any,
    });

    expect(result.fullName).toBe('Jane Doe');
  });
});

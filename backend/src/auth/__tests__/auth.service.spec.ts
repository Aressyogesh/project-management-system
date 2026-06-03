import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuthService } from '../auth.service';

const HASHED_PASSWORD = bcrypt.hashSync('Password@123', 10);

const mockActiveUser = {
  id: 'user-uuid-1',
  fullName: 'Super Admin',
  email: 'superadmin@pms.com',
  passwordHash: HASHED_PASSWORD,
  systemRole: SystemRole.SUPER_USER,
  isActive: true,
  createdAt: new Date(),
  lastLoginAt: null,
};

const mockInactiveUser = { ...mockActiveUser, isActive: false };

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = { sign: jest.fn().mockReturnValue('fake-access-token') };
const mockConfig = { get: jest.fn().mockReturnValue('15m') };
const mockAuditLogs = { log: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── validateUser ──────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('UTC-F001-B-001: ValidateUser_ValidCredentials_ReturnsUser', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockActiveUser);
      const result = await service.validateUser('superadmin@pms.com', 'Password@123');
      expect(result).not.toBeNull();
      expect((result as typeof mockActiveUser).email).toBe('superadmin@pms.com');
    });

    it('UTC-F001-B-002: ValidateUser_WrongPassword_ReturnsNull', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockActiveUser);
      const result = await service.validateUser('superadmin@pms.com', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('UTC-F001-B-003: ValidateUser_UnknownEmail_ReturnsNull', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser('ghost@pms.com', 'Password@123');
      expect(result).toBeNull();
    });

    it('UTC-F001-B-004: ValidateUser_InactiveAccount_ReturnsFalse', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockInactiveUser);
      const result = await service.validateUser('superadmin@pms.com', 'Password@123');
      expect(result).toBe(false);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('UTC-F001-B-005: Login_ValidUser_ReturnsTokensAndUser', async () => {
      mockJwt.sign.mockReturnValue('fake-access-token');
      mockConfig.get.mockReturnValue(7);
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue(mockActiveUser);

      const result = await service.login(mockActiveUser as any);

      expect(result.accessToken).toBe('fake-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken.length).toBeGreaterThan(0);
      expect(result.user.email).toBe('superadmin@pms.com');
      expect(result.user.systemRole).toBe(SystemRole.SUPER_USER);
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockActiveUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  // ─── refresh ──────────────────────────────────────────────────────────────

  describe('refresh', () => {
    const validStoredToken = {
      id: 'token-id',
      token: 'valid-refresh-token',
      userId: mockActiveUser.id,
      user: mockActiveUser,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      isRevoked: false,
    };

    it('UTC-F001-B-006: Refresh_ValidToken_ReturnsNewTokensAndRevokesOld', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(validStoredToken);
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockJwt.sign.mockReturnValue('new-access-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe('valid-refresh-token');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: validStoredToken.id },
        data: { isRevoked: true },
      });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('UTC-F001-B-007: Refresh_RevokedToken_ThrowsUnauthorizedException', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...validStoredToken,
        isRevoked: true,
      });
      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('UTC-F001-B-008: Refresh_ExpiredToken_ThrowsUnauthorizedException', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...validStoredToken,
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('UTC-F001-B-009: Refresh_TokenNotFound_ThrowsUnauthorizedException', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('nonexistent-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('UTC-F001-B-010: Logout_ValidToken_RevokesTokenInDatabase', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.logout('some-refresh-token')).resolves.not.toThrow();
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token' },
        data: { isRevoked: true },
      });
    });
  });
});

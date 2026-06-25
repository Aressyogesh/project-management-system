import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditAction, AuditEntity, ProjectRole, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';
import { AuthResponseDto, TokenPairDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditLogs: AuditLogsService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null | false> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    if (!user.isActive) return false;

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    return isPasswordValid ? user : null;
  }

  async login(user: User): Promise<AuthResponseDto> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);

    const [, hasManagementRole] = await Promise.all([
      this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      this.prisma.projectMember.count({
        where: {
          userId: user.id,
          projectRole: { in: [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD] },
        },
      }).then((n) => n > 0),
    ]);

    this.auditLogs.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: AuditEntity.AUTH,
      entityTitle: user.fullName,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        systemRole: user.systemRole,
        profilePhoto: user.profilePhoto ?? null,
        hasManagementRole,
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPairDto> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const newRefreshToken = await this.createRefreshToken(stored.userId);
    const accessToken = this.generateAccessToken(stored.user);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return silently — don't reveal whether the email is registered
    if (!user || !user.isActive) return;

    // Invalidate any previous unused tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const frontendUrl =
      this.configService.get<string>('APP_FRONTEND_URL') ?? 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.emailService.sendPasswordReset(user.email, user.fullName, resetLink);
    } catch (err) {
      this.logger.error('Failed to send password reset email', err);
      throw err;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { isRevoked: true },
      }),
    ]);
  }

  private generateAccessToken(user: Pick<User, 'id' | 'email' | 'systemRole'>): string {
    const payload = { sub: user.id, email: user.email, role: user.systemRole };
    const expiry = this.configService.get<string>('JWT_ACCESS_EXPIRY') ?? '15m';
    return this.jwtService.sign(payload, { expiresIn: expiry });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const days = this.configService.get<number>('JWT_REFRESH_EXPIRY_DAYS') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({ data: { token, userId, expiresAt } });
    return token;
  }
}

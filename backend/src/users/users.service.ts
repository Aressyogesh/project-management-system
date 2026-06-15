import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntity } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from './dto/users-query.dto';

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  systemRole: true,
  phone: true,
  joinDate: true,
  profilePhoto: true,
  isActive: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
  shift: { select: { id: true, name: true, shiftType: true } },
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  async findAll(query: UsersQueryDto) {
    const { page = 1, limit = 25, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: USER_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        passwordHash,
        systemRole: dto.systemRole,
        phone: dto.phone,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        departmentId: dto.departmentId || undefined,
        shiftId: dto.shiftId || undefined,
      },
      select: USER_SELECT,
    });

    const loginUrl =
      this.config.get<string>('APP_FRONTEND_URL') ?? 'http://localhost:5173';
    const body = `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;">
        Hi ${user.fullName}, welcome to <strong>PMS</strong>! Your account has been created.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <tbody>
          <tr><td style="padding:8px 12px;color:#6b7280;">Role</td><td style="padding:8px 12px;font-weight:600;">${user.systemRole}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280;">Email</td><td style="padding:8px 12px;">${user.email}</td></tr>
        </tbody>
      </table>
      <a href="${loginUrl}/login" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        Log In to PMS
      </a>
      <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">
        If you did not expect this email, please contact your administrator.
      </p>`;

    try {
      await this.email.sendEmail(
        user.email,
        `Welcome to PMS, ${user.fullName}!`,
        this.email.wrapHtml('Welcome to PMS', body),
      );
    } catch (err) {
      this.logger.error(
        `Failed to send welcome email to ${user.email}: ${(err as Error).message}`,
      );
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (conflict && conflict.id !== id) throw new ConflictException('Email already in use');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        departmentId: dto.departmentId !== undefined ? (dto.departmentId || null) : undefined,
        shiftId: dto.shiftId !== undefined ? (dto.shiftId || null) : undefined,
      },
      select: USER_SELECT,
    });
  }

  async setUserStatus(id: string, isActive: boolean, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: USER_SELECT,
    });
  }

  async updateProfilePhoto(id: string, filePath: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { profilePhoto: filePath },
      select: USER_SELECT,
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true,
        profilePhoto: true, systemRole: true,
        phone: true, joinDate: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, file?: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
      if (conflict && conflict.id !== userId) throw new ConflictException('Email already in use');
    }

    let passwordHash: string | undefined;
    if (dto.newPassword) {
      if (!dto.currentPassword) throw new BadRequestException('Current password is required to change password');
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!valid) throw new BadRequestException('Current password is incorrect');
      passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    const profilePhoto = file ? file.filename : undefined;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.email && { email: dto.email.toLowerCase() }),
        ...(passwordHash && { passwordHash }),
        ...(profilePhoto !== undefined && { profilePhoto }),
      },
      select: {
        id: true, fullName: true, email: true,
        profilePhoto: true, systemRole: true,
        phone: true, joinDate: true,
      },
    });

    this.auditLogs.log({
      userId,
      action: AuditAction.PROFILE_UPDATED,
      entity: AuditEntity.USER_PROFILE,
      entityId: userId,
      entityTitle: updated.fullName,
      metadata: {
        changedFields: [
          ...(dto.fullName ? ['fullName'] : []),
          ...(dto.email ? ['email'] : []),
          ...(passwordHash ? ['password'] : []),
          ...(profilePhoto !== undefined ? ['profilePhoto'] : []),
        ],
      },
    });

    return updated;
  }
}

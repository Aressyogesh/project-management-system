import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntity } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
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
  employeeId: true,
  joinDate: true,
  dateOfBirth: true,
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
    const { page = 1, limit = 25, search, departmentId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

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

  async createUser(dto: CreateUserDto, adminUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 8) +
      crypto.randomBytes(2).toString('hex').slice(0, 2);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        passwordHash,
        systemRole: dto.systemRole,
        phone: dto.phone,
        employeeId: dto.employeeId || undefined,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        departmentId: dto.departmentId || undefined,
        shiftId: dto.shiftId || undefined,
        mustResetPassword: true,
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
          <tr><td style="padding:8px 12px;color:#6b7280;">Temporary Password</td><td style="padding:8px 12px;font-weight:600;font-family:monospace;letter-spacing:2px;">${tempPassword}</td></tr>
        </tbody>
      </table>
      <p style="margin:0 0 16px;color:#374151;font-size:13px;">This is a system-generated temporary password. <strong>You will be required to change it on your first login before you can access the system.</strong></p>
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

    if (adminUserId) {
      this.auditLogs.log({
        userId: adminUserId,
        action: AuditAction.USER_CREATED,
        entity: AuditEntity.USER,
        entityId: user.id,
        entityTitle: `${user.fullName} (${user.email})`,
        metadata: { systemRole: user.systemRole },
      });
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, adminUserId?: string) {
    await this.findOne(id);

    if (dto.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (conflict && conflict.id !== id) throw new ConflictException('Email already in use');
    }

    const result = await this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        dateOfBirth: dto.dateOfBirth !== undefined ? (dto.dateOfBirth ? new Date(dto.dateOfBirth) : null) : undefined,
        departmentId: dto.departmentId !== undefined ? (dto.departmentId || null) : undefined,
        shiftId: dto.shiftId !== undefined ? (dto.shiftId || null) : undefined,
      },
      select: USER_SELECT,
    });

    if (adminUserId) {
      this.auditLogs.log({
        userId: adminUserId,
        action: AuditAction.USER_UPDATED,
        entity: AuditEntity.USER,
        entityId: id,
        entityTitle: result.fullName,
      });
    }

    return result;
  }

  async setUserStatus(id: string, isActive: boolean, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }
    const target = await this.findOne(id);
    const result = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: USER_SELECT,
    });
    this.auditLogs.log({
      userId: currentUserId,
      action: AuditAction.USER_STATUS_CHANGED,
      entity: AuditEntity.USER,
      entityId: id,
      entityTitle: target.fullName,
      metadata: { isActive },
    });
    return result;
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
    const [user, pmCount, mgmtCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, fullName: true, email: true,
          profilePhoto: true, systemRole: true,
          phone: true, joinDate: true, dateOfBirth: true,
        },
      }),
      this.prisma.projectMember.count({
        where: { userId, projectRole: 'PROJECT_MANAGER' },
      }),
      this.prisma.projectMember.count({
        where: { userId, projectRole: { in: ['PROJECT_MANAGER', 'TEAM_LEAD'] } },
      }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    return { ...user, hasPmRole: pmCount > 0, hasManagementRole: mgmtCount > 0 };
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
        ...(dto.dateOfBirth !== undefined && { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null }),
      },
      select: {
        id: true, fullName: true, email: true,
        profilePhoto: true, systemRole: true,
        phone: true, joinDate: true, dateOfBirth: true,
      },
    });

    if (passwordHash) {
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

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

  async getCelebrationsToday() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, profilePhoto: true, dateOfBirth: true, joinDate: true },
    });

    const celebrations: { type: 'BIRTHDAY' | 'ANNIVERSARY'; user: { id: string; fullName: string; profilePhoto: string | null }; yearsCount: number }[] = [];

    for (const u of users) {
      if (u.dateOfBirth) {
        const bMm = String(u.dateOfBirth.getMonth() + 1).padStart(2, '0');
        const bDd = String(u.dateOfBirth.getDate()).padStart(2, '0');
        if (bMm === mm && bDd === dd) {
          celebrations.push({ type: 'BIRTHDAY', user: { id: u.id, fullName: u.fullName, profilePhoto: u.profilePhoto }, yearsCount: today.getFullYear() - u.dateOfBirth.getFullYear() });
        }
      }
      if (u.joinDate) {
        const jMm = String(u.joinDate.getMonth() + 1).padStart(2, '0');
        const jDd = String(u.joinDate.getDate()).padStart(2, '0');
        if (jMm === mm && jDd === dd && u.joinDate.getFullYear() < today.getFullYear()) {
          celebrations.push({ type: 'ANNIVERSARY', user: { id: u.id, fullName: u.fullName, profilePhoto: u.profilePhoto }, yearsCount: today.getFullYear() - u.joinDate.getFullYear() });
        }
      }
    }

    return celebrations;
  }

  async postCelebrationAnnouncement(_requesterId: string) {
    const celebrations = await this.getCelebrationsToday();
    if (celebrations.length === 0) return null;

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const title = `Team Celebrations — ${dateStr}`;

    const existing = await this.prisma.announcement.findFirst({ where: { title } });
    if (existing) return existing;

    const birthdayPeople = celebrations.filter((c) => c.type === 'BIRTHDAY');
    const anniversaryPeople = celebrations.filter((c) => c.type === 'ANNIVERSARY');

    const birthdayLines = birthdayPeople.map(
      (c) => `<li>🎂 <strong>${c.user.fullName}</strong> — Wishing you a wonderful birthday filled with joy! May this year bring you great success and happiness! 🎊</li>`,
    );
    const anniversaryLines = anniversaryPeople.map(
      (c) => `<li>🏆 <strong>${c.user.fullName}</strong> — Celebrating <strong>${c.yearsCount} incredible year${c.yearsCount !== 1 ? 's' : ''}</strong> with us! Thank you for your dedication and hard work. Here's to many more! 🌟</li>`,
    );

    const sections: string[] = [];
    if (birthdayLines.length > 0) {
      sections.push(`<p><strong>🎂 Birthday Celebrations</strong></p><ul>${birthdayLines.join('')}</ul>`);
    }
    if (anniversaryLines.length > 0) {
      sections.push(`<p><strong>🏆 Work Anniversary Celebrations</strong></p><ul>${anniversaryLines.join('')}</ul>`);
    }

    const content = `<p>🥳 <strong>Hip Hip Hooray!</strong> Let's come together to celebrate our amazing team members who make every day special!</p>${sections.join('')}<p>Please join us in wishing them a fantastic day! 💐</p>`;

    return this.prisma.announcement.create({
      data: {
        title,
        content,
        scope: 'GLOBAL',
      },
    });
  }
}

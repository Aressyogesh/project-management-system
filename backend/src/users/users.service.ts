import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
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
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.user.create({
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
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessUnitDto, UpdateBusinessUnitDto } from './dto/business-unit.dto';

const BU_SELECT = { id: true, name: true, description: true, isActive: true, createdAt: true };

@Injectable()
export class BusinessUnitsService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.businessUnit.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
      select: BU_SELECT,
    });
  }

  async findOne(id: string) {
    const bu = await this.prisma.businessUnit.findUnique({ where: { id }, select: BU_SELECT });
    if (!bu) throw new NotFoundException('Business unit not found');
    return bu;
  }

  async create(dto: CreateBusinessUnitDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.businessUnit.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Business unit name already in use');
    return this.prisma.businessUnit.create({ data: { name, description: dto.description }, select: BU_SELECT });
  }

  async update(id: string, dto: UpdateBusinessUnitDto) {
    await this.findOne(id);
    if (dto.name) {
      const name = dto.name.trim();
      const conflict = await this.prisma.businessUnit.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Business unit name already in use');
      dto.name = name;
    }
    return this.prisma.businessUnit.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.description !== undefined && { description: dto.description.trim() || null }),
      },
      select: BU_SELECT,
    });
  }

  async setStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.businessUnit.update({ where: { id }, data: { isActive }, select: BU_SELECT });
  }
}

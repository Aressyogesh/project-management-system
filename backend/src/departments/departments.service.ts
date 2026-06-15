import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

const DEPT_SELECT = {
  id: true, name: true, isActive: true, createdAt: true,
  businessUnit: { select: { id: true, name: true } },
};

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.department.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
      select: DEPT_SELECT,
    });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id }, select: DEPT_SELECT });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.department.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Department name already in use');

    return this.prisma.department.create({
      data: { name, businessUnitId: dto.businessUnitId ?? null },
      select: DEPT_SELECT,
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);

    if (dto.name) {
      const name = dto.name.trim();
      const conflict = await this.prisma.department.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Department name already in use');
      dto.name = name;
    }

    return this.prisma.department.update({ where: { id }, data: dto, select: DEPT_SELECT });
  }

  async setStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: { isActive }, select: DEPT_SELECT });
  }
}

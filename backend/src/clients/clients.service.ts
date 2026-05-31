import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/client.dto';
import { UpdateClientDto } from './dto/client.dto';

const CLIENT_SELECT = {
  id: true,
  name: true,
  contactPerson: true,
  email: true,
  phone: true,
  address: true,
  isActive: true,
  createdAt: true,
  businessUnit: { select: { id: true, name: true } },
};

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.client.findMany({
      where: includeInactive ? undefined : { isActive: true },
      select: CLIENT_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id }, select: CLIENT_SELECT });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(dto: CreateClientDto) {
    const exists = await this.prisma.client.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
    });
    if (exists) throw new ConflictException('A client with this name already exists');
    return this.prisma.client.create({
      data: { ...dto, name: dto.name.trim() },
      select: CLIENT_SELECT,
    });
  }

  async update(id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    if (dto.name) {
      const conflict = await this.prisma.client.findFirst({
        where: { name: { equals: dto.name.trim(), mode: 'insensitive' }, NOT: { id } },
      });
      if (conflict) throw new ConflictException('A client with this name already exists');
    }
    return this.prisma.client.update({
      where: { id },
      data: { ...dto, ...(dto.name ? { name: dto.name.trim() } : {}) },
      select: CLIENT_SELECT,
    });
  }

  async setStatus(id: string, isActive: boolean) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    return this.prisma.client.update({ where: { id }, data: { isActive }, select: CLIENT_SELECT });
  }
}

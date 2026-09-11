import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntity, Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateClientDto } from './dto/client.dto';
import { UpdateClientDto } from './dto/client.dto';

const CLIENT_SELECT = {
  id: true,
  name: true,
  contactPerson: true,
  designation: true,
  email: true,
  phone: true,
  address: true,
  additionalContacts: true,
  isActive: true,
  createdAt: true,
  businessUnit: { select: { id: true, name: true } },
};

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

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

  async create(dto: CreateClientDto, userId: string) {
    const exists = await this.prisma.client.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
    });
    if (exists) throw new ConflictException('A client with this name already exists');
    const data: Prisma.ClientUncheckedCreateInput = {
      name: dto.name.trim(),
      contactPerson: dto.contactPerson,
      email: dto.email,
      additionalContacts: (dto.additionalContacts ?? []) as unknown as Prisma.InputJsonValue,
    };
    if (dto.designation) data.designation = dto.designation;
    if (dto.phone) data.phone = dto.phone;
    if (dto.address) data.address = dto.address;
    if (dto.businessUnitId) data.businessUnitId = dto.businessUnitId;
    const result = await this.prisma.client.create({ data, select: CLIENT_SELECT });
    this.auditLogs.log({ userId, action: AuditAction.CLIENT_CREATED, entity: AuditEntity.CLIENT, entityId: result.id, entityTitle: result.name });
    return result;
  }

  async update(id: string, dto: UpdateClientDto, userId: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    if (dto.name) {
      const conflict = await this.prisma.client.findFirst({
        where: { name: { equals: dto.name.trim(), mode: 'insensitive' }, NOT: { id } },
      });
      if (conflict) throw new ConflictException('A client with this name already exists');
    }
    const data: Prisma.ClientUncheckedUpdateInput = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.contactPerson !== undefined) data.contactPerson = dto.contactPerson;
    if (dto.designation !== undefined) data.designation = dto.designation || null;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    if (dto.businessUnitId !== undefined) data.businessUnitId = dto.businessUnitId;
    if (dto.additionalContacts !== undefined) {
      data.additionalContacts = dto.additionalContacts as unknown as Prisma.InputJsonValue;
    }
    const result = await this.prisma.client.update({ where: { id }, data, select: CLIENT_SELECT });
    this.auditLogs.log({ userId, action: AuditAction.CLIENT_UPDATED, entity: AuditEntity.CLIENT, entityId: id, entityTitle: result.name });
    return result;
  }

  async setStatus(id: string, isActive: boolean, userId: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    if (!isActive) {
      const activeCount = await this.prisma.project.count({
        where: { clientId: id, status: ProjectStatus.ACTIVE },
      });
      if (activeCount > 0) {
        throw new ConflictException(
          `Cannot deactivate: this client has ${activeCount} active project${activeCount > 1 ? 's' : ''}. Archive or reassign them first.`,
        );
      }
    }
    const result = await this.prisma.client.update({ where: { id }, data: { isActive }, select: CLIENT_SELECT });
    this.auditLogs.log({ userId, action: AuditAction.CLIENT_UPDATED, entity: AuditEntity.CLIENT, entityId: id, entityTitle: client.name, metadata: { isActive } });
    return result;
  }
}

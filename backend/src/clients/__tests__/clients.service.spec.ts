import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { ClientsService } from '../clients.service';

const ADMIN_USER_ID = 'admin-001';

const mockAuditLogs = { log: jest.fn() };

const mockPrisma = {
  client: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  project: {
    count: jest.fn(),
  },
};

const mockClient = {
  id: 'client-001',
  name: 'Acme Corp',
  contactPerson: 'Jane Doe',
  email: 'jane@acme.com',
  phone: null,
  address: null,
  additionalContacts: [],
  isActive: true,
  createdAt: new Date(),
};

describe('ClientsService', () => {
  let service: ClientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();
    service = module.get<ClientsService>(ClientsService);
    jest.clearAllMocks();
  });

  // UTC-F-006-B-001
  it('CreateClient_UniqueName_ReturnsCreatedClient', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);
    mockPrisma.client.create.mockResolvedValue({ ...mockClient, name: 'Acme Corp' });

    const result = await service.create({ name: 'Acme Corp', contactPerson: 'Jane', email: 'jane@acme.com' }, ADMIN_USER_ID);

    expect(result.name).toBe('Acme Corp');
    expect(mockPrisma.client.create).toHaveBeenCalledTimes(1);
  });

  // UTC-F-006-B-002
  it('CreateClient_DuplicateName_ThrowsConflictException', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(mockClient);

    await expect(service.create({ name: 'Acme Corp', contactPerson: 'X', email: 'x@x.com' }, ADMIN_USER_ID))
      .rejects.toThrow(ConflictException);
    expect(mockPrisma.client.create).not.toHaveBeenCalled();
  });

  // UTC-F-006-B-003
  it('UpdateClient_ValidData_ReturnsUpdatedClient', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.client.findFirst.mockResolvedValue(null);
    mockPrisma.client.update.mockResolvedValue({ ...mockClient, name: 'Beta Inc' });

    const result = await service.update('client-001', { name: 'Beta Inc' }, ADMIN_USER_ID);
    expect(result.name).toBe('Beta Inc');
  });

  // UTC-F-006-B-004
  it('UpdateClient_NotFound_ThrowsNotFoundException', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);

    await expect(service.update('bad-id', { name: 'X' }, ADMIN_USER_ID)).rejects.toThrow(NotFoundException);
  });

  // UTC-F-006-B-005
  it('UpdateClient_DuplicateName_ThrowsConflictException', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.client.findFirst.mockResolvedValue({ ...mockClient, id: 'client-002', name: 'Taken Name' });

    await expect(service.update('client-001', { name: 'Taken Name' }, ADMIN_USER_ID)).rejects.toThrow(ConflictException);
  });

  // UTC-F-006-B-006
  it('SetStatus_ValidId_TogglesIsActive', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.client.update.mockResolvedValue({ ...mockClient, isActive: false });

    const result = await service.setStatus('client-001', false, ADMIN_USER_ID);

    expect(result.isActive).toBe(false);
    expect(mockPrisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  // UTC-F-006-B-008
  it('SetStatus_DeactivateWithActiveProjects_ThrowsConflictException', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.project.count.mockResolvedValue(2);

    await expect(service.setStatus('client-001', false, ADMIN_USER_ID)).rejects.toThrow(ConflictException);
    expect(mockPrisma.client.update).not.toHaveBeenCalled();
  });

  // UTC-F-006-B-007
  it('FindAll_IncludeInactive_ReturnsAllClients', async () => {
    const inactive = { ...mockClient, id: 'client-002', isActive: false };
    mockPrisma.client.findMany.mockResolvedValue([mockClient, inactive]);

    const result = await service.findAll(true);

    expect(result.length).toBe(2);
    expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });
});

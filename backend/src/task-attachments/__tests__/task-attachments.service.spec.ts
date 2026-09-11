import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskAttachmentsService } from '../task-attachments.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const mockPrisma = {
  task: { findUnique: jest.fn() },
  taskAttachment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockAttachment = {
  id: 'att-001',
  taskId: 'task-001',
  filename: 'uuid-name.pdf',
  originalName: 'report.pdf',
  mimeType: 'application/pdf',
  size: 12345,
  uploadedById: 'user-001',
  createdAt: new Date(),
  uploadedBy: { id: 'user-001', fullName: 'Admin User' },
};

const mockFile = {
  fieldname: 'file',
  originalname: 'report.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  size: 12345,
  filename: 'uuid-name.pdf',
  destination: 'uploads/attachments',
  path: 'uploads/attachments/uuid-name.pdf',
  buffer: Buffer.from(''),
  stream: null as any,
} as Express.Multer.File;

describe('TaskAttachmentsService', () => {
  let service: TaskAttachmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAttachmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TaskAttachmentsService>(TaskAttachmentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // UTC-F-012-B-001
  it('UploadAttachment_ValidFile_ReturnsAttachment', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-001' });
    mockPrisma.taskAttachment.create.mockResolvedValue(mockAttachment);
    const result = await service.create('task-001', mockFile, 'user-001');
    expect(result.originalName).toBe('report.pdf');
    expect(mockPrisma.taskAttachment.create).toHaveBeenCalledTimes(1);
  });

  // UTC-F-012-B-002
  it('UploadAttachment_TaskNotFound_ThrowsNotFound', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);
    await expect(service.create('bad-task', mockFile, 'user-001')).rejects.toThrow(NotFoundException);
    expect(mockPrisma.taskAttachment.create).not.toHaveBeenCalled();
  });

  // UTC-F-012-B-003
  it('ListAttachments_ValidTask_ReturnsList', async () => {
    mockPrisma.taskAttachment.findMany.mockResolvedValue([mockAttachment]);
    const result = await service.findAll('task-001');
    expect(result).toHaveLength(1);
    expect(result[0].originalName).toBe('report.pdf');
  });

  // UTC-F-012-B-004
  it('DownloadAttachment_ValidId_ReturnsAttachment', async () => {
    mockPrisma.taskAttachment.findUnique.mockResolvedValue(mockAttachment);
    const result = await service.findOne('att-001');
    expect(result.filename).toBe('uuid-name.pdf');
  });

  // UTC-F-012-B-005
  it('DownloadAttachment_NotFound_ThrowsNotFound', async () => {
    mockPrisma.taskAttachment.findUnique.mockResolvedValue(null);
    await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
  });

  // UTC-F-012-B-006
  it('DeleteAttachment_ValidId_RemovesRecord', async () => {
    mockPrisma.taskAttachment.findUnique.mockResolvedValue(mockAttachment);
    mockPrisma.taskAttachment.delete.mockResolvedValue(mockAttachment);
    await service.remove('att-001');
    expect(mockPrisma.taskAttachment.delete).toHaveBeenCalledWith({ where: { id: 'att-001' } });
  });
});

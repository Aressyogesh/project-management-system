import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SystemRole } from '@prisma/client';
import { TaskCommentsService } from '../task-comments.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  task: { findUnique: jest.fn() },
  taskComment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockComment = {
  id: 'cmt-001',
  taskId: 'task-001',
  content: 'Looks good!',
  authorId: 'user-001',
  createdAt: new Date(),
  author: { id: 'user-001', fullName: 'Admin User' },
};

describe('TaskCommentsService', () => {
  let service: TaskCommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCommentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TaskCommentsService>(TaskCommentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // UTC-F-012-B-007
  it('CreateComment_ValidData_ReturnsComment', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-001' });
    mockPrisma.taskComment.create.mockResolvedValue(mockComment);
    const result = await service.create('task-001', { content: 'Looks good!' }, 'user-001');
    expect(result.content).toBe('Looks good!');
    expect(mockPrisma.taskComment.create).toHaveBeenCalledTimes(1);
  });

  // UTC-F-012-B-008
  it('CreateComment_TaskNotFound_ThrowsNotFound', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);
    await expect(service.create('bad-task', { content: 'Hi' }, 'user-001')).rejects.toThrow(NotFoundException);
    expect(mockPrisma.taskComment.create).not.toHaveBeenCalled();
  });

  // UTC-F-012-B-009
  it('ListComments_ValidTask_ReturnsList', async () => {
    mockPrisma.taskComment.findMany.mockResolvedValue([mockComment]);
    const result = await service.findAll('task-001');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Looks good!');
  });

  // UTC-F-012-B-010
  it('DeleteComment_Author_DeletesComment', async () => {
    mockPrisma.taskComment.findUnique.mockResolvedValue(mockComment);
    mockPrisma.taskComment.delete.mockResolvedValue(mockComment);
    await service.remove('cmt-001', 'user-001', SystemRole.EMPLOYEE);
    expect(mockPrisma.taskComment.delete).toHaveBeenCalledWith({ where: { id: 'cmt-001' } });
  });

  // UTC-F-012-B-011
  it('DeleteComment_Admin_DeletesComment', async () => {
    mockPrisma.taskComment.findUnique.mockResolvedValue({ ...mockComment, authorId: 'other-user' });
    mockPrisma.taskComment.delete.mockResolvedValue(mockComment);
    await service.remove('cmt-001', 'admin-001', SystemRole.ADMIN);
    expect(mockPrisma.taskComment.delete).toHaveBeenCalledTimes(1);
  });

  // UTC-F-012-B-012
  it('DeleteComment_UnauthorizedUser_ThrowsForbidden', async () => {
    mockPrisma.taskComment.findUnique.mockResolvedValue({ ...mockComment, authorId: 'other-user' });
    await expect(service.remove('cmt-001', 'user-001', SystemRole.EMPLOYEE)).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.taskComment.delete).not.toHaveBeenCalled();
  });
});

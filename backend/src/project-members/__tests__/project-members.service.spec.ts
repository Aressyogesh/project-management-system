import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectMembersService } from '../project-members.service';

const mockPrisma = {
  project: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  projectMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockProject = { id: 'proj-001', name: 'Alpha App' };
const mockUser = { id: 'user-001', fullName: 'Alice', isActive: true };
const mockMember = {
  id: 'mem-001',
  projectRole: 'DEVELOPER',
  joinedAt: new Date(),
  user: { id: 'user-001', fullName: 'Alice', email: 'alice@test.com', profilePhoto: null, department: null },
};

describe('ProjectMembersService', () => {
  let service: ProjectMembersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectMembersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ProjectMembersService>(ProjectMembersService);
    jest.clearAllMocks();
  });

  // UTC-F-008-B-001
  it('AddMember_ValidData_ReturnsMember', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.projectMember.findUnique.mockResolvedValue(null);
    mockPrisma.projectMember.create.mockResolvedValue(mockMember);

    const result = await service.addMember('proj-001', 'user-001', 'DEVELOPER' as any);
    expect(result.projectRole).toBe('DEVELOPER');
    expect(mockPrisma.projectMember.create).toHaveBeenCalledTimes(1);
  });

  // UTC-F-008-B-002
  it('AddMember_ProjectNotFound_ThrowsNotFoundException', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(service.addMember('bad-id', 'user-001', 'DEVELOPER' as any)).rejects.toThrow(NotFoundException);
  });

  // UTC-F-008-B-003
  it('AddMember_UserNotFound_ThrowsNotFoundException', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(service.addMember('proj-001', 'bad-user', 'DEVELOPER' as any)).rejects.toThrow(NotFoundException);
  });

  // UTC-F-008-B-004
  it('AddMember_DuplicateMember_ThrowsConflictException', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.projectMember.findUnique.mockResolvedValue(mockMember);

    await expect(service.addMember('proj-001', 'user-001', 'DEVELOPER' as any)).rejects.toThrow(ConflictException);
    expect(mockPrisma.projectMember.create).not.toHaveBeenCalled();
  });

  // UTC-F-008-B-005
  it('UpdateRole_ValidData_ReturnsUpdatedMember', async () => {
    mockPrisma.projectMember.findUnique.mockResolvedValue(mockMember);
    mockPrisma.projectMember.update.mockResolvedValue({ ...mockMember, projectRole: 'TEAM_LEAD' });

    const result = await service.updateRole('proj-001', 'user-001', 'TEAM_LEAD' as any);
    expect(result.projectRole).toBe('TEAM_LEAD');
  });

  // UTC-F-008-B-006
  it('UpdateRole_MemberNotFound_ThrowsNotFoundException', async () => {
    mockPrisma.projectMember.findUnique.mockResolvedValue(null);
    await expect(service.updateRole('proj-001', 'bad-user', 'TEAM_LEAD' as any)).rejects.toThrow(NotFoundException);
  });

  // UTC-F-008-B-007
  it('RemoveMember_ValidData_DeletesMember', async () => {
    mockPrisma.projectMember.findUnique.mockResolvedValue(mockMember);
    mockPrisma.projectMember.delete.mockResolvedValue(mockMember);

    await service.removeMember('proj-001', 'user-001');
    expect(mockPrisma.projectMember.delete).toHaveBeenCalledTimes(1);
  });

  // UTC-F-008-B-008
  it('RemoveMember_NotFound_ThrowsNotFoundException', async () => {
    mockPrisma.projectMember.findUnique.mockResolvedValue(null);
    await expect(service.removeMember('proj-001', 'bad-user')).rejects.toThrow(NotFoundException);
  });

  // UTC-F-008-B-009
  it('ListMembers_ValidProject_ReturnsMemberList', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);
    mockPrisma.projectMember.findMany.mockResolvedValue([mockMember]);

    const result = await service.listMembers('proj-001');
    expect(result).toHaveLength(1);
    expect(result[0].user.fullName).toBe('Alice');
  });
});

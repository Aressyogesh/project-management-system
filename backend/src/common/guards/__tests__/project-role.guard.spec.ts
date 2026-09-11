import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRole, SystemRole } from '@prisma/client';
import { ProjectRoleGuard } from '../project-role.guard';

const mockPrisma = {
  projectMember: { findFirst: jest.fn() },
  taskList: { findUnique: jest.fn() },
  task: { findUnique: jest.fn() },
  milestone: { findUnique: jest.fn() },
};

const mockReflector = { get: jest.fn() };

function buildContext(user: object, params: object = {}): ExecutionContext {
  return {
    getHandler: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
  } as unknown as ExecutionContext;
}

describe('ProjectRoleGuard', () => {
  let guard: ProjectRoleGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new ProjectRoleGuard(
      mockReflector as unknown as Reflector,
      mockPrisma as any,
    );
  });

  it('canActivate_NoDecorator_ReturnsTrue', async () => {
    mockReflector.get.mockReturnValueOnce(undefined);
    const result = await guard.canActivate(
      buildContext({ systemRole: SystemRole.EMPLOYEE }),
    );
    expect(result).toBe(true);
    expect(mockPrisma.projectMember.findFirst).not.toHaveBeenCalled();
  });

  it('canActivate_SuperUser_ReturnsTrue', async () => {
    mockReflector.get
      .mockReturnValueOnce([ProjectRole.PROJECT_MANAGER])
      .mockReturnValueOnce('param');
    const result = await guard.canActivate(
      buildContext({ id: 'u1', systemRole: SystemRole.SUPER_USER }, { projectId: 'p1' }),
    );
    expect(result).toBe(true);
    expect(mockPrisma.projectMember.findFirst).not.toHaveBeenCalled();
  });

  it('canActivate_Admin_ReturnsTrue', async () => {
    mockReflector.get
      .mockReturnValueOnce([ProjectRole.PROJECT_MANAGER])
      .mockReturnValueOnce('param');
    const result = await guard.canActivate(
      buildContext({ id: 'u1', systemRole: SystemRole.ADMIN }, { projectId: 'p1' }),
    );
    expect(result).toBe(true);
    expect(mockPrisma.projectMember.findFirst).not.toHaveBeenCalled();
  });

  it('canActivate_ProjectManagerMember_ReturnsTrue', async () => {
    mockReflector.get
      .mockReturnValueOnce([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD])
      .mockReturnValueOnce('param');
    mockPrisma.projectMember.findFirst.mockResolvedValueOnce({ projectRole: ProjectRole.PROJECT_MANAGER });
    const result = await guard.canActivate(
      buildContext({ id: 'u1', systemRole: SystemRole.EMPLOYEE }, { projectId: 'p1' }),
    );
    expect(result).toBe(true);
  });

  it('canActivate_TeamLeadMember_AllowedRoles_ReturnsTrue', async () => {
    mockReflector.get
      .mockReturnValueOnce([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD])
      .mockReturnValueOnce('param');
    mockPrisma.projectMember.findFirst.mockResolvedValueOnce({ projectRole: ProjectRole.TEAM_LEAD });
    const result = await guard.canActivate(
      buildContext({ id: 'u2', systemRole: SystemRole.EMPLOYEE }, { projectId: 'p1' }),
    );
    expect(result).toBe(true);
  });

  it('canActivate_TeamLeadMember_MilestoneRoute_ThrowsForbidden', async () => {
    mockReflector.get
      .mockReturnValueOnce([ProjectRole.PROJECT_MANAGER])
      .mockReturnValueOnce('param');
    mockPrisma.projectMember.findFirst.mockResolvedValueOnce({ projectRole: ProjectRole.TEAM_LEAD });
    await expect(
      guard.canActivate(
        buildContext({ id: 'u2', systemRole: SystemRole.EMPLOYEE }, { projectId: 'p1' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('canActivate_DeveloperMember_ThrowsForbidden', async () => {
    mockReflector.get
      .mockReturnValueOnce([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD])
      .mockReturnValueOnce('param');
    mockPrisma.projectMember.findFirst.mockResolvedValueOnce({ projectRole: ProjectRole.DEVELOPER });
    await expect(
      guard.canActivate(
        buildContext({ id: 'u3', systemRole: SystemRole.EMPLOYEE }, { projectId: 'p1' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('canActivate_NonMember_ThrowsForbidden', async () => {
    mockReflector.get
      .mockReturnValueOnce([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD])
      .mockReturnValueOnce('param');
    mockPrisma.projectMember.findFirst.mockResolvedValueOnce(null);
    await expect(
      guard.canActivate(
        buildContext({ id: 'u99', systemRole: SystemRole.EMPLOYEE }, { projectId: 'p1' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('canActivate_TaskListSource_ResolvesProjectIdFromDb', async () => {
    mockReflector.get
      .mockReturnValueOnce([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD])
      .mockReturnValueOnce('taskList');
    mockPrisma.taskList.findUnique.mockResolvedValueOnce({ projectId: 'p1' });
    mockPrisma.projectMember.findFirst.mockResolvedValueOnce({ projectRole: ProjectRole.TEAM_LEAD });
    const result = await guard.canActivate(
      buildContext({ id: 'u1', systemRole: SystemRole.EMPLOYEE }, { id: 'tl1' }),
    );
    expect(result).toBe(true);
    expect(mockPrisma.taskList.findUnique).toHaveBeenCalledWith({
      where: { id: 'tl1' },
      select: { projectId: true },
    });
  });
});

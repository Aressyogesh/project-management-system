import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MEMBER_SELECT = {
  id: true,
  projectRole: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      profilePhoto: true,
      department: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class ProjectMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(projectId: string) {
    await this.requireProject(projectId);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      select: MEMBER_SELECT,
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(projectId: string, userId: string, projectRole: ProjectRole) {
    await this.requireProject(projectId);
    await this.requireUser(userId);

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing) throw new ConflictException('User is already a member of this project');

    return this.prisma.projectMember.create({
      data: { projectId, userId, projectRole },
      select: MEMBER_SELECT,
    });
  }

  async updateRole(projectId: string, userId: string, projectRole: ProjectRole) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found in this project');

    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { projectRole },
      select: MEMBER_SELECT,
    });
  }

  async removeMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found in this project');

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  private async requireProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new NotFoundException('User not found or inactive');
  }
}

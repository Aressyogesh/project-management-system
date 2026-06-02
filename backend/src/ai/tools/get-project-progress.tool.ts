import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const PROJECT_PROGRESS_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_project_progress',
    description: 'Returns completion percentage for one or all projects. Use when user asks about project progress, how far along a project is, or overall project health.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Optional: get progress for a specific project only' },
      },
      required: [],
    },
  },
};

@Injectable()
export class GetProjectProgressTool {
  constructor(private readonly prisma: PrismaService) {}

  async execute(args: { projectId?: string }, ctx: ToolContext): Promise<{ data: any[]; sources: AiSourceDto[] }> {
    const projectId = args.projectId ?? ctx.projectId;

    const projectWhere: any = { status: 'ACTIVE' };

    if (ctx.systemRole === SystemRole.EMPLOYEE) {
      projectWhere.members = { some: { userId: ctx.userId } };
    }
    if (projectId) projectWhere.id = projectId;

    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      take: 20,
      select: { id: true, name: true, status: true, startDate: true, endDate: true },
    });

    const results = await Promise.all(
      projects.map(async (p) => {
        const [total, completed] = await Promise.all([
          this.prisma.workItem.count({ where: { projectId: p.id } }),
          this.prisma.workItem.count({ where: { projectId: p.id, status: 'QA_DONE' } }),
        ]);
        return {
          ...p,
          totalItems: total,
          completedItems: completed,
          progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
    );

    const sources: AiSourceDto[] = results.map((p) => ({
      type: 'project',
      id: p.id,
      title: p.name,
    }));

    return { data: results, sources };
  }
}

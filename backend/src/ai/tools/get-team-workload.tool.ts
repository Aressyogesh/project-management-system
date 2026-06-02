import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const TEAM_WORKLOAD_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_team_workload',
    description: 'Returns team members ranked by open work items assigned. CALL THIS for: "workload", "who is busy", "highest workload", "capacity", "who has most tasks", "Who has the highest workload?".',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Optional: limit to a specific project' },
        limit: { type: 'number', description: 'Number of top members to return (default 10)' },
      },
      required: [],
    },
  },
};

@Injectable()
export class GetTeamWorkloadTool {
  constructor(private readonly prisma: PrismaService) {}

  async execute(args: { projectId?: string; limit?: number }, ctx: ToolContext): Promise<{ data: any[]; sources: AiSourceDto[] }> {
    const limit = Math.min(args.limit ?? 10, 20);
    const projectId = args.projectId ?? ctx.projectId;

    const where: any = {
      assigneeId: { not: null },
      status: { notIn: ['QA_DONE'] },
    };
    if (projectId) {
      where.projectId = projectId;
    } else {
      where.project = { status: 'ACTIVE' };
    }

    const grouped = await this.prisma.workItem.groupBy({
      by: ['assigneeId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const userIds = grouped.map((g) => g.assigneeId as string);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u.fullName]));

    const data = grouped.map((g) => ({
      userId: g.assigneeId,
      fullName: userMap[g.assigneeId as string] ?? 'Unknown',
      openItems: g._count.id,
    }));

    return { data, sources: [] };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const SPRINT_SUMMARY_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_sprint_summary',
    description: 'Returns a summary of work items in a sprint grouped by status. Use when user asks about a specific sprint, its items, progress, or what is in the current sprint.',
    parameters: {
      type: 'object',
      properties: {
        sprintId: { type: 'string', description: 'Sprint ID to summarise' },
        projectId: { type: 'string', description: 'Optional: project ID to find the active sprint if sprintId not provided' },
      },
      required: [],
    },
  },
};

@Injectable()
export class GetSprintSummaryTool {
  constructor(private readonly prisma: PrismaService) {}

  async execute(args: { sprintId?: string; projectId?: string }, ctx: ToolContext): Promise<{ data: any; sources: AiSourceDto[] }> {
    const projectId = args.projectId ?? ctx.projectId;

    let sprint: any = null;
    if (args.sprintId) {
      sprint = await this.prisma.sprint.findUnique({ where: { id: args.sprintId } });
    } else if (projectId) {
      sprint = await this.prisma.sprint.findFirst({
        where: { projectId, isActive: true },
      });
    }

    if (!sprint) {
      return { data: { message: 'No sprint found.' }, sources: [] };
    }

    const items = await this.prisma.workItem.findMany({
      where: { sprintId: sprint.id },
      select: {
        id: true, title: true, status: true, priority: true,
        type: true, storyPoints: true,
        assignee: { select: { id: true, fullName: true } },
      },
    });

    const byStatus = items.reduce<Record<string, any[]>>((acc, item) => {
      acc[item.status] = [...(acc[item.status] ?? []), item];
      return acc;
    }, {});

    const sources: AiSourceDto[] = [
      { type: 'sprint', id: sprint.id, title: sprint.name },
      ...items.map((i) => ({ type: 'work_item' as const, id: i.id, title: i.title })),
    ];

    return {
      data: { sprint, totalItems: items.length, byStatus },
      sources,
    };
  }
}

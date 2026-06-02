import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const SPRINT_SUMMARY_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_sprint_summary',
    description: 'Returns work items in the current/active sprint grouped by status. CALL THIS for: "sprint summary", "current sprint", "what is in the sprint", "sprint items", "sprint progress", "Show current sprint".',
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
      const found = await this.prisma.sprint.findUnique({
        where: { id: args.sprintId },
        include: { project: { select: { status: true } } },
      });
      if (found && (found as any).project?.status === 'ACTIVE') sprint = found;
    } else if (projectId) {
      sprint = await this.prisma.sprint.findFirst({
        where: { projectId, isActive: true, project: { status: 'ACTIVE' } },
      });
    }

    if (!sprint) {
      return { data: { message: 'No sprint found.' }, sources: [] };
    }

    const itemWhere: any = { sprintId: sprint.id };
    if (ctx.systemRole === SystemRole.EMPLOYEE) itemWhere.assigneeId = ctx.userId;

    const items = await this.prisma.workItem.findMany({
      where: itemWhere,
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

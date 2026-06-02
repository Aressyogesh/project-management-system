import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const WEEKLY_SUMMARY_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_weekly_summary',
    description: 'Returns work items completed this week (since Monday). Use when user asks about work done this week, weekly output, or recent completions.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Optional: filter to a specific project' },
      },
      required: [],
    },
  },
};

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

@Injectable()
export class GetWeeklySummaryTool {
  constructor(private readonly prisma: PrismaService) {}

  async execute(args: { projectId?: string }, ctx: ToolContext): Promise<{ data: any[]; sources: AiSourceDto[] }> {
    const projectId = args.projectId ?? ctx.projectId;
    const startOfWeek = getStartOfWeek();

    const where: any = {
      completedAt: { gte: startOfWeek },
      status: 'QA_DONE',
    };

    if (ctx.systemRole === SystemRole.EMPLOYEE) where.assigneeId = ctx.userId;
    if (projectId) where.projectId = projectId;

    const items = await this.prisma.workItem.findMany({
      where,
      take: 30,
      orderBy: { completedAt: 'desc' },
      select: {
        id: true, title: true, type: true, completedAt: true, storyPoints: true,
        assignee: { select: { id: true, fullName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    const sources: AiSourceDto[] = items.map((i) => ({
      type: 'work_item',
      id: i.id,
      title: i.title,
    }));

    return { data: items, sources };
  }
}

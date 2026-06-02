import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const BLOCKED_ITEMS_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_blocked_items',
    description: 'Returns work items with BLOCKED status. Use when user asks about blockers, blocked tasks, or impediments.',
    parameters: {
      type: 'object',
      properties: {
        sprintId: { type: 'string', description: 'Optional: filter to a specific sprint' },
        projectId: { type: 'string', description: 'Optional: filter to a specific project' },
      },
      required: [],
    },
  },
};

@Injectable()
export class GetBlockedItemsTool {
  constructor(private readonly prisma: PrismaService) {}

  async execute(args: { sprintId?: string; projectId?: string }, ctx: ToolContext): Promise<{ data: any[]; sources: AiSourceDto[] }> {
    const projectId = args.projectId ?? ctx.projectId;

    const where: any = { status: 'BLOCKED' };

    if (ctx.systemRole === SystemRole.EMPLOYEE) {
      where.assigneeId = ctx.userId;
    }
    if (args.sprintId) where.sprintId = args.sprintId;
    if (projectId) where.projectId = projectId;

    const items = await this.prisma.workItem.findMany({
      where,
      take: 30,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, priority: true, type: true,
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
        sprint: { select: { id: true, name: true } },
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

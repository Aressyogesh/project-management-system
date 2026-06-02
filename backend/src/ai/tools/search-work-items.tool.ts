import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const SEARCH_WORK_ITEMS_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'search_work_items',
    description: 'Free-text search across work item titles and descriptions. Use when user asks to find or search for specific work items by keyword.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword or phrase' },
        projectId: { type: 'string', description: 'Optional: limit search to a project' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },
};

@Injectable()
export class SearchWorkItemsTool {
  constructor(private readonly prisma: PrismaService) {}

  async execute(args: { query: string; projectId?: string; limit?: number }, ctx: ToolContext): Promise<{ data: any[]; sources: AiSourceDto[] }> {
    const limit = Math.min(args.limit ?? 10, 20);
    const projectId = args.projectId ?? ctx.projectId;

    const where: any = {
      OR: [
        { title: { contains: args.query, mode: 'insensitive' } },
        { description: { contains: args.query, mode: 'insensitive' } },
      ],
    };

    if (ctx.systemRole === SystemRole.EMPLOYEE) where.assigneeId = ctx.userId;
    if (projectId) where.projectId = projectId;

    const items = await this.prisma.workItem.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, status: true, priority: true, type: true,
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
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

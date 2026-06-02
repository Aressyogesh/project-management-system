import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const BLOCKED_ITEMS_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_blocked_items',
    description: 'Returns work items with BLOCKED status. CALL THIS for: "blocked items", "blockers", "impediments", "stuck tasks", "Any blocked items?".',
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
      where.project = { status: 'ACTIVE' };
    } else if (projectId) {
      where.projectId = projectId;
    } else {
      where.project = { status: 'ACTIVE' };
    }
    if (args.sprintId) where.sprintId = args.sprintId;

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

    const workItemSources: AiSourceDto[] = items.map((i) => ({
      type: 'work_item',
      id: i.id,
      title: i.title,
    }));

    // Board links — one per unique project with blocked items
    const projectsSeen = new Map<string, string>();
    items.forEach((i) => {
      if (i.project && !projectsSeen.has(i.project.id)) {
        projectsSeen.set(i.project.id, i.project.name);
      }
    });
    const boardSources: AiSourceDto[] = Array.from(projectsSeen.entries()).map(([id, name]) => ({
      type: 'board',
      id,
      title: `${name} Board`,
      url: `/projects/${id}/board`,
    }));

    return { data: items, sources: [...boardSources, ...workItemSources] };
  }
}

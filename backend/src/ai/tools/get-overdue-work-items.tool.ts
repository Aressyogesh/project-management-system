import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';

export interface ToolContext {
  userId: string;
  systemRole: SystemRole;
  projectId?: string;
}

export const OVERDUE_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_overdue_work_items',
    description: 'Returns work items and tasks that are past their due date and not yet completed (QA_DONE). Use when user asks about overdue tasks, missed deadlines, or late items.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Optional: filter to a specific project ID' },
        limit: { type: 'number', description: 'Max results to return (default 20)' },
      },
      required: [],
    },
  },
};

@Injectable()
export class GetOverdueWorkItemsTool {
  constructor(private readonly prisma: PrismaService) {}

  async execute(args: { projectId?: string; limit?: number }, ctx: ToolContext): Promise<{ data: any[]; sources: AiSourceDto[] }> {
    const limit = Math.min(args.limit ?? 20, 50);
    const projectId = args.projectId ?? ctx.projectId;

    const where: any = {
      dueDate: { lt: new Date() },
      status: { notIn: ['QA_DONE'] },
    };

    if (ctx.systemRole === SystemRole.EMPLOYEE) {
      where.assigneeId = ctx.userId;
    } else if (projectId) {
      where.projectId = projectId;
    }

    const items = await this.prisma.workItem.findMany({
      where,
      take: limit,
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        type: true,
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

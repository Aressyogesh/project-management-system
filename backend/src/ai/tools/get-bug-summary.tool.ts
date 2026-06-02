import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const BUG_SUMMARY_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_bug_summary',
    description: 'Returns a summary of bugs grouped by severity and status. Use when user asks about bugs, defects, issues, or bug counts.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Optional: filter to a specific project' },
      },
      required: [],
    },
  },
};

@Injectable()
export class GetBugSummaryTool {
  constructor(private readonly prisma: PrismaService) {}

  async execute(args: { projectId?: string }, ctx: ToolContext): Promise<{ data: any; sources: AiSourceDto[] }> {
    const projectId = args.projectId ?? ctx.projectId;

    const where: any = { type: 'BUG' };
    if (projectId) where.projectId = projectId;
    if (ctx.systemRole === SystemRole.EMPLOYEE) where.assigneeId = ctx.userId;

    const [bySeverity, byStatus, recent] = await Promise.all([
      this.prisma.workItem.groupBy({
        by: ['severity'],
        where,
        _count: { id: true },
      }),
      this.prisma.workItem.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.workItem.findMany({
        where: { ...where, status: { notIn: ['QA_DONE', 'CLOSED'] } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, severity: true, status: true },
      }),
    ]);

    const sources: AiSourceDto[] = recent.map((b) => ({
      type: 'work_item',
      id: b.id,
      title: b.title,
    }));

    return {
      data: {
        bySeverity: bySeverity.map((b) => ({ severity: b.severity, count: b._count.id })),
        byStatus: byStatus.map((b) => ({ status: b.status, count: b._count.id })),
        recentOpen: recent,
      },
      sources,
    };
  }
}

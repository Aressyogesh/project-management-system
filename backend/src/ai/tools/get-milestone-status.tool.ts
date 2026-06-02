import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const MILESTONE_STATUS_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_milestone_status',
    description: 'Returns milestones and their status. CALL THIS for: "milestones", "deliveries", "delivery dates", "delayed milestones", "upcoming milestones", "release dates".',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Optional: filter to a specific project' },
        status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'], description: 'Optional: filter by milestone status' },
      },
      required: [],
    },
  },
};

@Injectable()
export class GetMilestoneStatusTool {
  constructor(private readonly prisma: PrismaService) {}

  async execute(args: { projectId?: string; status?: string }, ctx: ToolContext): Promise<{ data: any[]; sources: AiSourceDto[] }> {
    const projectId = args.projectId ?? ctx.projectId;

    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    } else {
      where.project = { status: 'ACTIVE' };
    }
    if (args.status) where.status = args.status;

    const milestones = await this.prisma.milestone.findMany({
      where,
      take: 20,
      orderBy: { dueDate: 'asc' },
      select: {
        id: true, name: true, description: true, status: true,
        startDate: true, dueDate: true,
        project: { select: { id: true, name: true } },
        responsibleUser: { select: { id: true, fullName: true } },
      },
    });

    const sources: AiSourceDto[] = milestones.map((m) => ({
      type: 'milestone',
      id: m.id,
      title: m.name ?? m.description ?? 'Milestone',
    }));

    return { data: milestones, sources };
  }
}

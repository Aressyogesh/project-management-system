import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSourceDto } from '../dto/chat-response.dto';
import { ToolContext } from './get-overdue-work-items.tool';

export const SPRINT_VELOCITY_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_sprint_velocity',
    description: 'Returns story points committed vs delivered for the current sprint. CALL THIS for: "velocity", "story points", "burndown", "points delivered", "sprint velocity".',
    parameters: {
      type: 'object',
      properties: {
        sprintId: { type: 'string', description: 'Sprint ID to measure velocity for' },
        projectId: { type: 'string', description: 'Optional: used to find active sprint if sprintId not given' },
      },
      required: [],
    },
  },
};

@Injectable()
export class GetSprintVelocityTool {
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

    const [committed, delivered] = await Promise.all([
      this.prisma.workItem.aggregate({
        where: { sprintId: sprint.id },
        _sum: { storyPoints: true },
      }),
      this.prisma.workItem.aggregate({
        where: { sprintId: sprint.id, status: 'QA_DONE' },
        _sum: { storyPoints: true },
      }),
    ]);

    const committedPoints = committed._sum.storyPoints ?? 0;
    const deliveredPoints = delivered._sum.storyPoints ?? 0;
    const velocityPercent = committedPoints > 0
      ? Math.round((deliveredPoints / committedPoints) * 100)
      : 0;

    const sources: AiSourceDto[] = [{ type: 'sprint', id: sprint.id, title: sprint.name }];

    return {
      data: { sprint: { id: sprint.id, name: sprint.name }, committedPoints, deliveredPoints, velocityPercent },
      sources,
    };
  }
}

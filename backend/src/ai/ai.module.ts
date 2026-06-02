import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GetOverdueWorkItemsTool } from './tools/get-overdue-work-items.tool';
import { GetSprintSummaryTool } from './tools/get-sprint-summary.tool';
import { GetBlockedItemsTool } from './tools/get-blocked-items.tool';
import { GetProjectProgressTool } from './tools/get-project-progress.tool';
import { GetTeamWorkloadTool } from './tools/get-team-workload.tool';
import { GetBugSummaryTool } from './tools/get-bug-summary.tool';
import { GetWeeklySummaryTool } from './tools/get-weekly-summary.tool';
import { GetMilestoneStatusTool } from './tools/get-milestone-status.tool';
import { GetSprintVelocityTool } from './tools/get-sprint-velocity.tool';
import { SearchWorkItemsTool } from './tools/search-work-items.tool';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [
    AiService,
    GetOverdueWorkItemsTool,
    GetSprintSummaryTool,
    GetBlockedItemsTool,
    GetProjectProgressTool,
    GetTeamWorkloadTool,
    GetBugSummaryTool,
    GetWeeklySummaryTool,
    GetMilestoneStatusTool,
    GetSprintVelocityTool,
    SearchWorkItemsTool,
  ],
})
export class AiModule {}

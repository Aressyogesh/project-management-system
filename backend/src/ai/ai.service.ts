import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemRole } from '@prisma/client';
import { Ollama } from 'ollama';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatResponseDto, HealthResponseDto } from './dto/chat-response.dto';
import { GetOverdueWorkItemsTool, OVERDUE_TOOL_DEFINITION } from './tools/get-overdue-work-items.tool';
import { GetSprintSummaryTool, SPRINT_SUMMARY_TOOL_DEFINITION } from './tools/get-sprint-summary.tool';
import { GetBlockedItemsTool, BLOCKED_ITEMS_TOOL_DEFINITION } from './tools/get-blocked-items.tool';
import { GetProjectProgressTool, PROJECT_PROGRESS_TOOL_DEFINITION } from './tools/get-project-progress.tool';
import { GetTeamWorkloadTool, TEAM_WORKLOAD_TOOL_DEFINITION } from './tools/get-team-workload.tool';
import { GetBugSummaryTool, BUG_SUMMARY_TOOL_DEFINITION } from './tools/get-bug-summary.tool';
import { GetWeeklySummaryTool, WEEKLY_SUMMARY_TOOL_DEFINITION } from './tools/get-weekly-summary.tool';
import { GetMilestoneStatusTool, MILESTONE_STATUS_TOOL_DEFINITION } from './tools/get-milestone-status.tool';
import { GetSprintVelocityTool, SPRINT_VELOCITY_TOOL_DEFINITION } from './tools/get-sprint-velocity.tool';
import { SearchWorkItemsTool, SEARCH_WORK_ITEMS_TOOL_DEFINITION } from './tools/search-work-items.tool';

const TOOL_DEFINITIONS = [
  OVERDUE_TOOL_DEFINITION,
  SPRINT_SUMMARY_TOOL_DEFINITION,
  BLOCKED_ITEMS_TOOL_DEFINITION,
  PROJECT_PROGRESS_TOOL_DEFINITION,
  TEAM_WORKLOAD_TOOL_DEFINITION,
  BUG_SUMMARY_TOOL_DEFINITION,
  WEEKLY_SUMMARY_TOOL_DEFINITION,
  MILESTONE_STATUS_TOOL_DEFINITION,
  SPRINT_VELOCITY_TOOL_DEFINITION,
  SEARCH_WORK_ITEMS_TOOL_DEFINITION,
];

const SYSTEM_PROMPT = `You are an AI assistant embedded in a Project Management System (PMS).
You help users understand their project data — tasks, work items, sprints, milestones, bugs, and team workload.
You have access to tools that query the live database. Use the appropriate tool(s) to answer the user's question accurately.
Always base your answers on the tool results — do not make up data.
Be concise, factual, and helpful. Format lists clearly. If no data is found, say so honestly.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ollama: Ollama;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly overdueWorkItemsTool: GetOverdueWorkItemsTool,
    private readonly sprintSummaryTool: GetSprintSummaryTool,
    private readonly blockedItemsTool: GetBlockedItemsTool,
    private readonly projectProgressTool: GetProjectProgressTool,
    private readonly teamWorkloadTool: GetTeamWorkloadTool,
    private readonly bugSummaryTool: GetBugSummaryTool,
    private readonly weeklySummaryTool: GetWeeklySummaryTool,
    private readonly milestoneStatusTool: GetMilestoneStatusTool,
    private readonly sprintVelocityTool: GetSprintVelocityTool,
    private readonly searchWorkItemsTool: SearchWorkItemsTool,
  ) {
    this.model = this.config.get<string>('AI_MODEL') ?? 'llama3.2:3b';
    this.ollama = new Ollama({
      host: this.config.get<string>('AI_BASE_URL') ?? 'http://localhost:11434',
    });
  }

  async chat(
    dto: ChatMessageDto,
    userId: string,
    systemRole: SystemRole,
  ): Promise<ChatResponseDto> {
    const ctx = { userId, systemRole, projectId: dto.projectId };
    const conversationId = dto.conversationId ?? crypto.randomUUID();

    const history = (dto.history ?? []).slice(-10).map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: dto.message },
    ];

    const allSources: any[] = [];
    const toolsUsed: string[] = [];

    try {
      // First call — let the model decide which tools to call
      const firstResponse = await this.ollama.chat({
        model: this.model,
        messages,
        tools: TOOL_DEFINITIONS,
      });

      let finalAnswer = firstResponse.message.content;

      // Execute any tool calls the model requested
      if (firstResponse.message.tool_calls?.length) {
        const toolResultMessages: any[] = [{ role: 'assistant', content: firstResponse.message }];

        for (const toolCall of firstResponse.message.tool_calls) {
          const name = toolCall.function.name;
          const args = toolCall.function.arguments ?? {};
          toolsUsed.push(name);

          let result: { data: any; sources: any[] } = { data: null, sources: [] };

          try {
            result = await this.executeTool(name, args, ctx);
          } catch (err) {
            this.logger.warn(`Tool ${name} failed: ${err.message}`);
            result = { data: { error: `Tool ${name} returned no data.` }, sources: [] };
          }

          allSources.push(...result.sources);

          toolResultMessages.push({
            role: 'tool',
            content: JSON.stringify(result.data),
          });
        }

        // Second call — model summarises tool results into a final answer
        const secondResponse = await this.ollama.chat({
          model: this.model,
          messages: [...messages, ...toolResultMessages],
        });

        finalAnswer = secondResponse.message.content;
      }

      return {
        answer: finalAnswer,
        sources: allSources,
        toolsUsed,
        conversationId,
      };
    } catch (err) {
      if (err?.cause?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
        throw new HttpException('Ollama service is not reachable. Please ensure Ollama is running.', HttpStatus.SERVICE_UNAVAILABLE);
      }
      this.logger.error('AI chat error', err);
      throw new HttpException('AI service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getHealth(): Promise<HealthResponseDto> {
    const model = this.model;
    try {
      await this.ollama.list();
      return { status: 'ok', ollama: { reachable: true, model }, version: '1.0.0' };
    } catch {
      return { status: 'degraded', ollama: { reachable: false, model }, version: '1.0.0' };
    }
  }

  private async executeTool(name: string, args: any, ctx: any): Promise<{ data: any; sources: any[] }> {
    switch (name) {
      case 'get_overdue_work_items':    return this.overdueWorkItemsTool.execute(args, ctx);
      case 'get_sprint_summary':        return this.sprintSummaryTool.execute(args, ctx);
      case 'get_blocked_items':         return this.blockedItemsTool.execute(args, ctx);
      case 'get_project_progress':      return this.projectProgressTool.execute(args, ctx);
      case 'get_team_workload':         return this.teamWorkloadTool.execute(args, ctx);
      case 'get_bug_summary':           return this.bugSummaryTool.execute(args, ctx);
      case 'get_weekly_summary':        return this.weeklySummaryTool.execute(args, ctx);
      case 'get_milestone_status':      return this.milestoneStatusTool.execute(args, ctx);
      case 'get_sprint_velocity':       return this.sprintVelocityTool.execute(args, ctx);
      case 'search_work_items':         return this.searchWorkItemsTool.execute(args, ctx);
      default:
        this.logger.warn(`Unknown tool requested: ${name}`);
        return { data: null, sources: [] };
    }
  }
}

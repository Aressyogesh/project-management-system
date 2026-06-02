import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemRole } from '@prisma/client';
import { Ollama } from 'ollama';
import { PrismaService } from '../prisma/prisma.service';
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

const ADMIN_ROLES = new Set<SystemRole>([SystemRole.SUPER_USER, SystemRole.ADMIN]);

// Pre-route known query patterns directly to a tool — skips the slow first Ollama call
const KEYWORD_ROUTES: [RegExp, string][] = [
  [/blocked/i,                                         'get_blocked_items'],
  [/overdue|missed deadline|past due|late task/i,      'get_overdue_work_items'],
  [/this week|done this week|completed this week|weekly/i, 'get_weekly_summary'],
  [/my sprint|in.*sprint|sprint.*item|current sprint|sprint summary/i, 'get_sprint_summary'],
  [/workload|who.*busy|highest workload|capacity/i,    'get_team_workload'],
  [/bug|defect/i,                                      'get_bug_summary'],
  [/milestone/i,                                       'get_milestone_status'],
  [/velocity|story point|burndown/i,                   'get_sprint_velocity'],
  [/progress/i,                                        'get_project_progress'],
];

function preRoute(message: string): string | null {
  for (const [pattern, tool] of KEYWORD_ROUTES) {
    if (pattern.test(message)) return tool;
  }
  return null;
}

const BASE_SYSTEM_PROMPT = `You are an AI assistant embedded in a Project Management System (PMS).
You help users understand their project data — tasks, work items, sprints, milestones, bugs, and team workload.
You MUST call one or more tools to answer any question about project data. Never invent data.

Tool selection guide (use the BEST match):
- "overdue", "missed deadline", "late tasks", "past due" → get_overdue_work_items
- "sprint summary", "current sprint", "sprint items", "what's in the sprint" → get_sprint_summary
- "blocked", "blockers", "impediments", "stuck" → get_blocked_items
- "project progress", "completion", "how far along", "project status" → get_project_progress
- "workload", "who is busy", "capacity", "assignments", "team load" → get_team_workload
- "bugs", "defects", "issues", "bug count" → get_bug_summary
- "this week", "weekly", "done this week", "completed this week" → get_weekly_summary
- "milestones", "deliveries", "delivery dates", "release dates" → get_milestone_status
- "velocity", "story points", "burndown", "points delivered" → get_sprint_velocity
- "find", "search", "look for" + keyword → search_work_items

Rules:
- Only return data from ACTIVE projects (archived projects are excluded automatically).
- Be concise and factual. Format lists clearly with item titles and status.
- If no data is found, say so honestly.`;

function buildSystemPrompt(projectName?: string): string {
  if (!projectName) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}\n\nContext: the user is asking about project "${projectName}". Scope all tool calls to this project.`;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ollama: Ollama;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
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
    const conversationId = dto.conversationId ?? crypto.randomUUID();

    // Resolve project scope before calling the model
    const { projectId, projectName, clarify } = await this.resolveProjectContext(dto, userId, systemRole);
    if (clarify) return { ...clarify, conversationId };

    const ctx = { userId, systemRole, projectId };

    const history = (dto.history ?? []).slice(-10).map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const messages: any[] = [
      { role: 'system', content: buildSystemPrompt(projectName) },
      ...history,
      { role: 'user', content: dto.message },
    ];

    const allSources: any[] = [];
    const toolsUsed: string[] = [];

    try {
      const preRoutedTool = preRoute(dto.message);
      let toolResultMessages: any[] = [];

      if (preRoutedTool) {
        // Fast path — skip the first Ollama call entirely
        this.logger.log(`Pre-routed "${dto.message}" → ${preRoutedTool}`);
        toolsUsed.push(preRoutedTool);
        let result: { data: any; sources: any[] } = { data: null, sources: [] };
        try {
          result = await this.executeTool(preRoutedTool, {}, ctx);
        } catch (err) {
          this.logger.warn(`Tool ${preRoutedTool} failed: ${err.message}`);
          result = { data: { error: `Tool ${preRoutedTool} returned no data.` }, sources: [] };
        }
        allSources.push(...result.sources);
        toolResultMessages = [
          { role: 'assistant', content: '', tool_calls: [{ function: { name: preRoutedTool, arguments: {} } }] },
          { role: 'tool', content: JSON.stringify(result.data) },
        ];
      } else {
        // Slow path — ask the model to select a tool
        const firstResponse = await this.withTimeout(
          this.ollama.chat({ model: this.model, messages, tools: TOOL_DEFINITIONS }),
          55_000,
          'Model did not respond in time. Try a simpler question.',
        );

        if (!firstResponse.message.tool_calls?.length) {
          return { answer: firstResponse.message.content, sources: [], toolsUsed, conversationId };
        }

        toolResultMessages = [{
          role: 'assistant',
          content: firstResponse.message.content ?? '',
          tool_calls: firstResponse.message.tool_calls,
        }];

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
          toolResultMessages.push({ role: 'tool', content: JSON.stringify(result.data) });
        }
      }

      // Final call — model summarises tool results into a natural language answer
      const summaryResponse = await this.withTimeout(
        this.ollama.chat({ model: this.model, messages: [...messages, ...toolResultMessages] }),
        55_000,
        'Model took too long to summarise results.',
      );

      return { answer: summaryResponse.message.content, sources: allSources, toolsUsed, conversationId };
    } catch (err) {
      if (err?.cause?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
        throw new HttpException(
          'Ollama is not running. Start it with: ollama serve',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      if (err instanceof HttpException) throw err;
      this.logger.error('AI chat error', err?.message ?? err);
      throw new HttpException(
        err?.message ?? 'AI service error — please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async resolveProjectContext(
    dto: ChatMessageDto,
    userId: string,
    systemRole: SystemRole,
  ): Promise<{
    projectId?: string;
    projectName?: string;
    clarify?: Omit<ChatResponseDto, 'conversationId'>;
  }> {
    // Admins see everything — no project scoping
    if (ADMIN_ROLES.has(systemRole)) {
      return { projectId: dto.projectId };
    }

    // User already specified a project in this request
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
        select: { name: true, status: true },
      });
      if (!project || (project as any).status === 'ARCHIVE') {
        return {
          clarify: {
            answer: 'That project is archived and no longer active. I can only provide information about active projects.',
            sources: [],
            toolsUsed: [],
          },
        };
      }
      return { projectId: dto.projectId, projectName: project.name };
    }

    // Fetch only ACTIVE projects this user is a member of
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId, project: { status: 'ACTIVE' } },
      select: { project: { select: { id: true, name: true } } },
    });
    const projects = memberships.map((m) => m.project);

    if (projects.length === 0) {
      return {
        clarify: {
          answer: "You are not assigned to any projects yet. Please ask your administrator to add you to a project first.",
          sources: [],
          toolsUsed: [],
        },
      };
    }

    if (projects.length === 1) {
      return { projectId: projects[0].id, projectName: projects[0].name };
    }

    // Multiple projects — try to match the project name mentioned in the message
    const msgLower = dto.message.toLowerCase();
    const matched = projects.find((p) => msgLower.includes(p.name.toLowerCase()));
    if (matched) {
      return { projectId: matched.id, projectName: matched.name };
    }

    // Ask the user to clarify which project they mean
    const list = projects.map((p) => `• ${p.name}`).join('\n');
    return {
      clarify: {
        answer: `You are a member of ${projects.length} projects. Which project would you like me to check?\n\n${list}\n\nMention the project name in your message and I'll answer right away.`,
        sources: projects.map((p) => ({ type: 'project' as const, id: p.id, title: p.name })),
        toolsUsed: [],
      },
    };
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new HttpException(message, HttpStatus.GATEWAY_TIMEOUT)),
        ms,
      );
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
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

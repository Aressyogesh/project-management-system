import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as https from 'https';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ChatDto } from './dto/chat.dto';

const GROQ_HOST = 'api.groq.com';
const GROQ_PATH = '/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile'; // E5: upgraded for better reasoning
const MAX_CONTEXT_ITEMS = 10;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type ActionIntent =
  | { type: 'UPDATE_TASK_STATUS'; workItemId: string; displayId: string; title: string; newStatus: string; label: string }
  | { type: 'LOG_TIMESHEET'; workItemId: string; displayId: string; title: string; hours: number; date: string; label: string }
  | { type: 'SUBMIT_LEAVE'; leaveType: string; startDate: string; endDate: string; reason: string; label: string };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async chat(
    dto: ChatDto,
    user: { id: string; systemRole: string; fullName: string },
  ): Promise<{ reply: string; action?: ActionIntent }> {
    // E4: Proactive greeting
    if (dto.message.startsWith('__greet__')) {
      return this.buildGreeting(dto.message, user);
    }

    const context = await this.buildContext(dto.message, user);
    const systemPrompt = this.buildSystemPrompt(user, context);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...dto.history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: dto.message },
    ];

    try {
      const raw = await this.callGroq(messages);
      return this.parseAction(raw); // E2: parse action intents
    } catch (err) {
      this.logger.error('Groq API error', err);
      throw new InternalServerErrorException('AI service unavailable. Please try again later.');
    }
  }

  // E4: greeting with overdue count + sprint alert
  private async buildGreeting(
    message: string,
    user: { id: string; fullName: string },
  ): Promise<{ reply: string }> {
    const firstName = message.replace('__greet__', '').trim() || user.fullName.split(' ')[0];
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [overdueCount, activeSprint] = await Promise.all([
      this.prisma.workItem.count({
        where: { assigneeId: user.id, status: { not: 'QA_DONE' }, dueDate: { lt: todayStart } },
      }),
      this.prisma.sprint.findFirst({
        where: { isActive: true, project: { members: { some: { userId: user.id } } } },
        select: { name: true, endDate: true },
        orderBy: { endDate: 'asc' },
      }),
    ]);

    const alerts: string[] = [];
    if (overdueCount > 0) alerts.push(`${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}`);
    if (activeSprint?.endDate) {
      const daysLeft = Math.ceil((activeSprint.endDate.getTime() - Date.now()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 3)
        alerts.push(
          `sprint "${activeSprint.name}" ends ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}`,
        );
    }

    const alertText = alerts.length ? ` Heads up — you have ${alerts.join(' and ')}.` : '';
    return { reply: `Good ${timeOfDay}, ${firstName}! I'm your PMS assistant.${alertText} What would you like to know?` };
  }

  // E2: strip ACTION:{...} token from reply and return as structured field
  private parseAction(raw: string): { reply: string; action?: ActionIntent } {
    const match = raw.match(/ACTION:(\{[\s\S]+?\})\s*$/m);
    if (!match) return { reply: raw.trim() };
    try {
      const action = JSON.parse(match[1]) as ActionIntent;
      const reply = raw.replace(/\n?ACTION:\{[\s\S]+?\}\s*$/m, '').trim();
      return { reply, action };
    } catch {
      return { reply: raw.trim() };
    }
  }

  private callGroq(messages: ChatMessage[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ model: MODEL, messages, max_tokens: 600, temperature: 0.3 });
      const req = https.request(
        {
          hostname: GROQ_HOST,
          path: GROQ_PATH,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(new Error(`Groq ${res.statusCode}: ${raw}`));
              return;
            }
            try {
              const data = JSON.parse(raw) as { choices: { message: { content: string } }[] };
              resolve(data.choices[0]?.message?.content ?? 'No response from AI.');
            } catch {
              reject(new Error('Failed to parse Groq response'));
            }
          });
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private async buildContext(message: string, user: { id: string; systemRole: string }): Promise<string> {
    const msg = message.toLowerCase();
    const isAdmin = ['SUPER_USER', 'ADMIN'].includes(user.systemRole);
    const isMgr = ['PROJECT_MANAGER', 'TEAM_LEAD'].includes(user.systemRole);

    const parts: string[] = [];
    const queries: Promise<void>[] = [];

    // General work items
    if (this.mentions(msg, ['task', 'work item', 'overdue', 'due', 'bug', 'story', 'board', 'todo', 'doing', 'done'])) {
      queries.push(
        this.prisma.workItem
          .findMany({
            where: isAdmin ? {} : { assigneeId: user.id },
            select: {
              id: true,
              displayId: true,
              title: true,
              status: true,
              dueDate: true,
              type: true,
              assignee: { select: { fullName: true } },
              project: { select: { name: true } },
            },
            orderBy: { dueDate: 'asc' },
            take: MAX_CONTEXT_ITEMS,
          })
          .then((items) => {
            if (items.length)
              parts.push(
                'WORK ITEMS:\n' +
                  items
                    .map(
                      (w) =>
                        `- workItemId:${w.id} [${w.displayId ?? 'N/A'}] ${w.title} | ${w.type} | ${w.status} | due: ${w.dueDate ? w.dueDate.toISOString().slice(0, 10) : 'none'} | assignee: ${w.assignee?.fullName ?? 'unassigned'} | project: ${w.project?.name ?? 'N/A'}`,
                    )
                    .join('\n'),
              );
          }),
      );
    }

    // E1: Daily focus summary
    if (this.mentions(msg, ['focus', 'today', 'daily', 'standup', 'prioritize', 'prioritise', 'what should i', 'start with'])) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart.getTime() + 86400000);

      queries.push(
        Promise.all([
          this.prisma.workItem.findMany({
            where: { assigneeId: user.id, status: { not: 'QA_DONE' }, dueDate: { lt: todayEnd } },
            select: { displayId: true, title: true, status: true, dueDate: true, project: { select: { name: true } } },
            orderBy: { dueDate: 'asc' },
            take: 15,
          }),
          this.prisma.sprint.findFirst({
            where: { isActive: true, project: { members: { some: { userId: user.id } } } },
            select: { name: true, endDate: true },
            orderBy: { endDate: 'asc' },
          }),
        ]).then(([focusItems, sprint]) => {
          const overdue = focusItems.filter((i) => i.dueDate && i.dueDate < todayStart);
          const dueToday = focusItems.filter((i) => i.dueDate && i.dueDate >= todayStart);
          const lines = [`DAILY FOCUS (${todayStart.toISOString().slice(0, 10)}):`];
          lines.push(overdue.length ? `Overdue (${overdue.length}):` : 'Overdue: none');
          overdue.forEach((i) => lines.push(`  - [${i.displayId ?? 'N/A'}] ${i.title} | ${i.status} | project: ${i.project?.name ?? 'N/A'}`));
          lines.push(dueToday.length ? `Due today (${dueToday.length}):` : 'Due today: none');
          dueToday.forEach((i) => lines.push(`  - [${i.displayId ?? 'N/A'}] ${i.title} | ${i.status} | project: ${i.project?.name ?? 'N/A'}`));
          if (sprint?.endDate) {
            const daysLeft = Math.ceil((sprint.endDate.getTime() - Date.now()) / 86400000);
            lines.push(`Active sprint: "${sprint.name}" ends ${sprint.endDate.toISOString().slice(0, 10)} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`);
          }
          parts.push(lines.join('\n'));
        }),
      );
    }

    // Projects
    if (this.mentions(msg, ['project', 'milestone', 'progress', 'team', 'member'])) {
      queries.push(
        this.prisma.project
          .findMany({
            where: isAdmin || isMgr ? {} : { members: { some: { userId: user.id } } },
            select: { name: true, status: true, _count: { select: { workItems: true, members: true } } },
            take: MAX_CONTEXT_ITEMS,
          })
          .then((projects) => {
            if (projects.length)
              parts.push(
                'PROJECTS:\n' +
                  projects
                    .map((p) => `- ${p.name} | status: ${p.status} | work items: ${p._count.workItems} | members: ${p._count.members}`)
                    .join('\n'),
              );
          }),
      );
    }

    // E3: Sprint health
    if (this.mentions(msg, ['sprint health', 'sprint status', 'on track', 'velocity', 'burndown', 'burn down'])) {
      queries.push(
        this.prisma.sprint
          .findFirst({
            where: {
              isActive: true,
              ...(isAdmin || isMgr ? {} : { project: { members: { some: { userId: user.id } } } }),
            },
            select: { name: true, startDate: true, endDate: true, workItems: { select: { status: true, storyPoints: true } } },
            orderBy: { endDate: 'asc' },
          })
          .then((sprint) => {
            if (!sprint) return;
            const total = sprint.workItems.length;
            const done = sprint.workItems.filter((i) => i.status === 'QA_DONE').length;
            const blocked = sprint.workItems.filter((i) => i.status === 'BLOCKED').length;
            const totalPts = sprint.workItems.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
            const burnedPts = sprint.workItems.filter((i) => i.status === 'QA_DONE').reduce((s, i) => s + (i.storyPoints ?? 0), 0);
            const daysLeft = sprint.endDate ? Math.ceil((sprint.endDate.getTime() - Date.now()) / 86400000) : null;
            parts.push(
              `SPRINT HEALTH — "${sprint.name}":\n` +
                `  Period: ${sprint.startDate?.toISOString().slice(0, 10) ?? 'N/A'} → ${sprint.endDate?.toISOString().slice(0, 10) ?? 'N/A'}` +
                (daysLeft !== null ? ` (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)` : '') + '\n' +
                `  Items: ${done}/${total} done | ${blocked} blocked\n` +
                `  Story points: ${burnedPts}/${totalPts} burned`,
            );
          }),
      );
    }

    // KPI
    if (this.mentions(msg, ['kpi', 'score', 'performance', 'metric', 'rating'])) {
      const period = this.resolvePeriod(msg);
      queries.push(
        this.analytics.getKpi(period, user.id, isAdmin).then((results) => {
          if (!results.length) return;
          if (isAdmin) {
            parts.push(
              `KPI SCORES (${period}) — all users:\n` +
                results
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .slice(0, MAX_CONTEXT_ITEMS)
                  .map((r) => `- ${r.name}: ${r.totalScore} pts`)
                  .join('\n'),
            );
          } else {
            const r = results[0];
            parts.push(
              `KPI SCORE (${period}) for ${r.name}: ${r.totalScore} pts\n` +
                r.metrics.map((m) => `  ${m.metricId}: ${m.points} pts`).join('\n'),
            );
          }
        }),
      );
    }

    // Leave
    if (this.mentions(msg, ['leave', 'absence', 'attendance', 'holiday'])) {
      queries.push(
        this.prisma.leaveRequest
          .findMany({
            where: isAdmin ? {} : { userId: user.id },
            select: { user: { select: { fullName: true } }, startDate: true, endDate: true, status: true, reason: true },
            orderBy: { startDate: 'desc' },
            take: MAX_CONTEXT_ITEMS,
          })
          .then((leaves) => {
            if (leaves.length)
              parts.push(
                'LEAVE REQUESTS:\n' +
                  leaves
                    .map((l) => `- ${l.user.fullName} | ${l.startDate.toISOString().slice(0, 10)} to ${l.endDate.toISOString().slice(0, 10)} | ${l.status}`)
                    .join('\n'),
              );
          }),
      );
    }

    // E2: Action intent — always fetch assigned tasks so LLM can resolve IDs
    if (this.mentions(msg, ['mark', 'set status', 'log hours', 'log time', 'apply for leave', 'request leave', 'complete task', 'finish task'])) {
      queries.push(
        this.prisma.workItem
          .findMany({
            where: { assigneeId: user.id },
            select: { id: true, displayId: true, title: true, status: true, project: { select: { name: true } } },
            orderBy: { dueDate: 'asc' },
            take: MAX_CONTEXT_ITEMS,
          })
          .then((items) => {
            if (items.length)
              parts.push(
                'YOUR ASSIGNED TASKS (use workItemId for actions):\n' +
                  items
                    .map((w) => `- workItemId:${w.id} | [${w.displayId ?? 'N/A'}] ${w.title} | ${w.status} | project: ${w.project?.name ?? 'N/A'}`)
                    .join('\n'),
              );
          }),
      );
    }

    await Promise.all(queries);
    return parts.join('\n\n');
  }

  private buildSystemPrompt(user: { id: string; systemRole: string; fullName: string }, context: string): string {
    const today = new Date().toISOString().slice(0, 10);
    return `You are PMS Assistant — a professional, friendly AI assistant built into a project management system.

Today is ${today}. You are speaking with ${user.fullName} (role: ${user.systemRole}).

## How to respond
- Acknowledge the user's intent with a brief empathetic opener (1 sentence) before answering.
- Be concise, clear, and respectful — like a knowledgeable colleague, not a chatbot.
- Use bullet points or numbered steps for lists and multi-part answers.
- If something is unclear, ask one clarifying question rather than guessing.

## Data rules
- Use ONLY the live data below. Never invent numbers, statuses, names, or dates.
- KPI scores are raw points (e.g. "35 pts"), NOT percentages. Do not convert them.
- If data is missing, say "I don't have that right now — check the [module] for the latest details."

## Action intents
If the user wants to update a task status, log hours, or apply for leave, respond with a brief confirmation message then on a NEW LINE output exactly one of these tokens (no extra text after it):
ACTION:{"type":"UPDATE_TASK_STATUS","workItemId":"<uuid>","displayId":"<id>","title":"<title>","newStatus":"<status>","label":"<label>"}
ACTION:{"type":"LOG_TIMESHEET","workItemId":"<uuid>","displayId":"<id>","title":"<title>","hours":<number>,"date":"${today}","label":"<label>"}
ACTION:{"type":"SUBMIT_LEAVE","leaveType":"<SICK|CASUAL|EARNED|OTHER>","startDate":"<YYYY-MM-DD>","endDate":"<YYYY-MM-DD>","reason":"<text>","label":"<label>"}
Rules: only emit ACTION if you have ALL required fields from the data. Use the workItemId UUID (not displayId). Valid statuses: TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, READY_FOR_QA, IN_QA, QA_DONE.

## Live data
${context || 'No specific data was retrieved for this query.'}`;
  }

  private resolvePeriod(msg: string): string {
    const now = new Date();
    if (msg.includes('last month') || msg.includes('previous month')) {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    for (let i = 0; i < monthNames.length; i++) {
      if (msg.includes(monthNames[i])) {
        const yearMatch = msg.match(/\b(20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : now.getFullYear();
        return `${year}-${String(i + 1).padStart(2, '0')}`;
      }
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private mentions(msg: string, keywords: string[]): boolean {
    return keywords.some((k) => msg.includes(k));
  }
}

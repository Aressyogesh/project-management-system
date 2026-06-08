import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as https from 'https';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ChatDto } from './dto/chat.dto';

const GROQ_HOST = 'api.groq.com';
const GROQ_PATH = '/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';
const MAX_CONTEXT_ITEMS = 10;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async chat(dto: ChatDto, user: { id: string; systemRole: string; fullName: string }): Promise<{ reply: string }> {
    if (dto.message.startsWith('__greet__')) {
      const firstName = dto.message.replace('__greet__', '').trim() || user.fullName.split(' ')[0];
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      return { reply: `Good ${timeOfDay}, ${firstName}! I'm your PMS assistant. I can help you with tasks, projects, KPIs, and more. What would you like to know?` };
    }

    const context = await this.buildContext(dto.message, user);
    const systemPrompt = this.buildSystemPrompt(user, context);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...dto.history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: dto.message },
    ];

    try {
      const reply = await this.callGroq(messages);
      return { reply };
    } catch (err) {
      this.logger.error('Groq API error', err);
      throw new InternalServerErrorException('AI service unavailable. Please try again later.');
    }
  }

  private callGroq(messages: ChatMessage[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ model: MODEL, messages, max_tokens: 512, temperature: 0.3 });
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

    if (this.mentions(msg, ['task', 'work item', 'overdue', 'due', 'bug', 'story', 'sprint', 'board', 'todo', 'doing', 'done'])) {
      queries.push(
        this.prisma.workItem
          .findMany({
            where: isAdmin ? {} : { assigneeId: user.id },
            select: {
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
            if (items.length) {
              parts.push(
                'WORK ITEMS:\n' +
                  items
                    .map(
                      (w) =>
                        `- [${w.displayId ?? 'N/A'}] ${w.title} | ${w.type} | ${w.status} | due: ${w.dueDate ? w.dueDate.toISOString().slice(0, 10) : 'none'} | assignee: ${w.assignee?.fullName ?? 'unassigned'} | project: ${w.project?.name ?? 'N/A'}`,
                    )
                    .join('\n'),
              );
            }
          }),
      );
    }

    if (this.mentions(msg, ['project', 'sprint', 'milestone', 'progress', 'team', 'member'])) {
      queries.push(
        this.prisma.project
          .findMany({
            where: isAdmin || isMgr ? {} : { members: { some: { userId: user.id } } },
            select: {
              name: true,
              status: true,
              _count: { select: { workItems: true, members: true } },
            },
            take: MAX_CONTEXT_ITEMS,
          })
          .then((projects) => {
            if (projects.length) {
              parts.push(
                'PROJECTS:\n' +
                  projects
                    .map((p) => `- ${p.name} | status: ${p.status} | work items: ${p._count.workItems} | members: ${p._count.members}`)
                    .join('\n'),
              );
            }
          }),
      );
    }

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
            if (leaves.length) {
              parts.push(
                'LEAVE REQUESTS:\n' +
                  leaves
                    .map((l) => `- ${l.user.fullName} | ${l.startDate.toISOString().slice(0, 10)} to ${l.endDate.toISOString().slice(0, 10)} | ${l.status}`)
                    .join('\n'),
              );
            }
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
- Always acknowledge the user's perspective or intent before giving an answer. A brief empathetic opener (1 sentence) is enough.
- Be concise, clear, and respectful. Avoid jargon or overly technical language unless the user's role warrants it.
- Use a warm but professional tone — the way a knowledgeable colleague would speak, not a chatbot.
- For lists or multi-part answers, use a short structured format (bullet points or numbered steps).
- If something is unclear, ask one clarifying question rather than guessing.

## Data rules
- Use ONLY the live data provided below. Never invent, estimate, or assume numbers, statuses, names, or dates not present in it.
- KPI scores are in raw points (e.g. "35 pts out of ~100"), NOT percentages. Do not convert to a percentage unless one is explicitly in the data.
- If the data does not contain the answer, respond: "I don't have that information right now — you can check the [relevant module] for the latest details."
- If asked to create or modify something, explain you can guide the user to the right place in the app.

## Live data
${context || 'No specific data was retrieved for this query.'}`;
  }

  private resolvePeriod(msg: string): string {
    const now = new Date();
    if (msg.includes('last month') || msg.includes('previous month')) {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
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

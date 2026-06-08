import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatDto } from './dto/chat.dto';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';
const MAX_CONTEXT_ITEMS = 10;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({ model: MODEL, messages, max_tokens: 512, temperature: 0.3 }),
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Groq error ${res.status}: ${err}`);
        throw new Error(`Groq ${res.status}`);
      }
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      const reply = data.choices[0]?.message?.content ?? 'No response from AI.';
      return { reply };
    } catch (err) {
      this.logger.error('Groq API error', err);
      throw new InternalServerErrorException('AI service unavailable. Please try again later.');
    }
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
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      queries.push(
        this.prisma.kpiRecord
          .findMany({
            where: isAdmin ? {} : { userId: user.id },
            select: { user: { select: { fullName: true } }, metricId: true, points: true, period: true },
            orderBy: { period: 'desc' },
            take: MAX_CONTEXT_ITEMS,
          })
          .then((records) => {
            const current = records.filter((r) => r.period === period);
            if (current.length) {
              parts.push(
                `KPI RECORDS (${period}):\n` +
                  current.map((r) => `- ${r.user.fullName} | ${r.metricId}: ${r.points} pts`).join('\n'),
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
    return `You are PMS Assistant, a helpful AI for a project management system.
Today is ${today}. You are talking to ${user.fullName} (role: ${user.systemRole}).
Answer concisely and factually. Use the live data below. If asked to create something, explain you can help navigate there.
Do not make up data not present below.

${context || 'No specific data retrieved for this query.'}`;
  }

  private mentions(msg: string, keywords: string[]): boolean {
    return keywords.some((k) => msg.includes(k));
  }
}

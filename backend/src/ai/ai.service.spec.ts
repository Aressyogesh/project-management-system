import { Test } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import * as https from 'https';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

jest.mock('https');

const mockUser = { id: 'u1', systemRole: 'EMPLOYEE', fullName: 'Test User' };
const adminUser = { id: 'u2', systemRole: 'SUPER_USER', fullName: 'Admin User' };

function setupHttpsMock(statusCode: number, responseBody: string) {
  (https.request as jest.Mock).mockImplementation((_opts: unknown, cb: (res: unknown) => void) => {
    const res = {
      statusCode,
      on: jest.fn((event: string, handler: (data?: string) => void) => {
        if (event === 'data') handler(responseBody);
        if (event === 'end') handler();
      }),
    };
    cb(res);
    return { write: jest.fn(), end: jest.fn(), on: jest.fn() };
  });
}

describe('AiService', () => {
  let service: AiService;
  let prisma: jest.Mocked<PrismaService>;
  let analytics: jest.Mocked<AnalyticsService>;

  beforeEach(async () => {
    setupHttpsMock(200, JSON.stringify({ choices: [{ message: { content: 'Mock reply' } }] }));

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: PrismaService,
          useValue: {
            workItem: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
            project: { findMany: jest.fn().mockResolvedValue([]) },
            sprint: { findFirst: jest.fn().mockResolvedValue(null) },
            leaveRequest: { findMany: jest.fn().mockResolvedValue([]) },
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            getKpi: jest.fn().mockResolvedValue([
              { userId: 'u1', name: 'Test User', totalScore: 35, metrics: [] },
            ]),
          },
        },
      ],
    }).compile();

    service = module.get(AiService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    analytics = module.get(AnalyticsService) as jest.Mocked<AnalyticsService>;
  });

  // ── F-036 regression ──────────────────────────────────────────────────────────

  it('UTC-F036-001 — returns reply from Groq', async () => {
    const result = await service.chat({ message: 'Hello', history: [] }, mockUser);
    expect(result).toEqual({ reply: 'Mock reply' });
  });

  it('UTC-F036-002 — throws InternalServerErrorException on Groq error', async () => {
    setupHttpsMock(503, 'Service unavailable');
    await expect(service.chat({ message: 'Hello', history: [] }, mockUser)).rejects.toThrow(InternalServerErrorException);
  });

  it('UTC-F036-003 — fetches work items when message mentions tasks', async () => {
    await service.chat({ message: 'show my overdue tasks', history: [] }, mockUser);
    expect(prisma.workItem.findMany).toHaveBeenCalled();
  });

  it('UTC-F036-004 — EMPLOYEE work item query scoped to own userId', async () => {
    await service.chat({ message: 'show my tasks', history: [] }, mockUser);
    const call = (prisma.workItem.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toMatchObject({ assigneeId: 'u1' });
  });

  it('UTC-F036-005 — SUPER_USER work item query has no assigneeId filter', async () => {
    await service.chat({ message: 'show all tasks', history: [] }, adminUser);
    const call = (prisma.workItem.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it('UTC-F036-006 — history is forwarded to Groq messages', async () => {
    let capturedBody = '';
    (https.request as jest.Mock).mockImplementation((_opts: unknown, cb: (res: unknown) => void) => {
      const res = {
        statusCode: 200,
        on: jest.fn((event: string, handler: (data?: string) => void) => {
          if (event === 'data') handler(JSON.stringify({ choices: [{ message: { content: 'Mock reply' } }] }));
          if (event === 'end') handler();
        }),
      };
      cb(res);
      return { write: jest.fn((data: string) => { capturedBody = data; }), end: jest.fn(), on: jest.fn() };
    });
    const history = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'assistant' as const, content: 'Hello' },
    ];
    await service.chat({ message: 'follow up', history }, mockUser);
    const body = JSON.parse(capturedBody);
    expect(body.messages[1]).toMatchObject({ role: 'user', content: 'Hi' });
    expect(body.messages[2]).toMatchObject({ role: 'assistant', content: 'Hello' });
  });

  it('UTC-F036-007 — KPI message calls getKpi not workItem.findMany', async () => {
    await service.chat({ message: 'what is my kpi score', history: [] }, mockUser);
    expect(prisma.workItem.findMany).not.toHaveBeenCalled();
    expect(analytics.getKpi).toHaveBeenCalled();
  });

  it('UTC-F036-008 — fetches projects when message mentions project', async () => {
    await service.chat({ message: 'show my projects', history: [] }, mockUser);
    expect(prisma.project.findMany).toHaveBeenCalled();
  });

  // ── F-037 new tests ───────────────────────────────────────────────────────────

  it('UTC-F037-001 — daily focus fetches work items and sprint', async () => {
    (prisma.workItem.findMany as jest.Mock).mockResolvedValue([]);
    await service.chat({ message: 'what should I focus on today?', history: [] }, mockUser);
    expect(prisma.workItem.findMany).toHaveBeenCalled();
    expect(prisma.sprint.findFirst).toHaveBeenCalled();
  });

  it('UTC-F037-002 — daily focus sprint query filters by active sprint', async () => {
    await service.chat({ message: 'what should I focus on today?', history: [] }, mockUser);
    const call = (prisma.sprint.findFirst as jest.Mock).mock.calls[0][0];
    expect(call.where).toMatchObject({ isActive: true });
  });

  it('UTC-F037-003 — sprint health fetched on sprint status keywords', async () => {
    await service.chat({ message: 'is our sprint on track?', history: [] }, mockUser);
    expect(prisma.sprint.findFirst).toHaveBeenCalled();
  });

  it('UTC-F037-004 — sprint health not fetched for unrelated message', async () => {
    await service.chat({ message: 'show my tasks', history: [] }, mockUser);
    expect(prisma.sprint.findFirst).not.toHaveBeenCalled();
  });

  it('UTC-F037-005 — action intent parsed from LLM ACTION token', async () => {
    const actionJson = '{"type":"UPDATE_TASK_STATUS","workItemId":"w1","displayId":"PMS-1","title":"Fix bug","newStatus":"QA_DONE","label":"Mark PMS-1 as Done"}';
    setupHttpsMock(200, JSON.stringify({ choices: [{ message: { content: `Sure!\nACTION:${actionJson}` } }] }));
    const result = await service.chat({ message: 'mark PMS-1 as done', history: [] }, mockUser);
    expect(result.action).toBeDefined();
    expect(result.action?.type).toBe('UPDATE_TASK_STATUS');
    expect(result.reply).not.toContain('ACTION:');
  });

  it('UTC-F037-006 — no action field when LLM reply has no ACTION token', async () => {
    const result = await service.chat({ message: 'hello', history: [] }, mockUser);
    expect(result.action).toBeUndefined();
  });

  it('UTC-F037-007 — action intent fetches assigned tasks for ID resolution', async () => {
    await service.chat({ message: 'mark PMS-1 as done', history: [] }, mockUser);
    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assigneeId: 'u1' } }),
    );
  });

  it('UTC-F037-008 — proactive greeting includes overdue count', async () => {
    (prisma.workItem.count as jest.Mock).mockResolvedValue(3);
    (prisma.sprint.findFirst as jest.Mock).mockResolvedValue({
      name: 'Sprint 5',
      endDate: new Date(Date.now() + 2 * 86400000),
    });
    const result = await service.chat({ message: '__greet__Yogesh', history: [] }, mockUser);
    expect(result.reply).toMatch(/3 overdue/i);
    expect(result.reply).toMatch(/sprint "Sprint 5"/i);
  });

  it('UTC-F037-009 — proactive greeting with no alerts is clean', async () => {
    (prisma.workItem.count as jest.Mock).mockResolvedValue(0);
    (prisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await service.chat({ message: '__greet__Yogesh', history: [] }, mockUser);
    expect(result.reply).not.toMatch(/overdue/i);
    expect(result.reply).not.toMatch(/sprint/i);
  });

  it('UTC-F037-010 — model is llama-3.3-70b-versatile', async () => {
    let capturedBody = '';
    (https.request as jest.Mock).mockImplementation((_opts: unknown, cb: (res: unknown) => void) => {
      const res = {
        statusCode: 200,
        on: jest.fn((event: string, handler: (data?: string) => void) => {
          if (event === 'data') handler(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }));
          if (event === 'end') handler();
        }),
      };
      cb(res);
      return { write: jest.fn((d: string) => { capturedBody = d; }), end: jest.fn(), on: jest.fn() };
    });
    await service.chat({ message: 'hello', history: [] }, mockUser);
    expect(JSON.parse(capturedBody).model).toBe('llama-3.3-70b-versatile');
  });
});

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
            workItem: { findMany: jest.fn().mockResolvedValue([]) },
            project: { findMany: jest.fn().mockResolvedValue([]) },
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

  it('UTC-F036-001 — returns reply from Groq', async () => {
    const result = await service.chat({ message: 'Hello', history: [] }, mockUser);
    expect(result).toEqual({ reply: 'Mock reply' });
  });

  it('UTC-F036-002 — throws InternalServerErrorException on Groq error', async () => {
    setupHttpsMock(503, 'Service unavailable');
    await expect(service.chat({ message: 'Hello', history: [] }, mockUser)).rejects.toThrow(
      InternalServerErrorException,
    );
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
      return {
        write: jest.fn((data: string) => { capturedBody = data; }),
        end: jest.fn(),
        on: jest.fn(),
      };
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
});

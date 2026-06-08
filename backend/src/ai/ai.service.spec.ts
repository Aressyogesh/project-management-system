import { Test } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUser = { id: 'u1', systemRole: 'EMPLOYEE', fullName: 'Test User' };
const adminUser = { id: 'u2', systemRole: 'SUPER_USER', fullName: 'Admin User' };

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AiService', () => {
  let service: AiService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Mock reply' } }] }),
    });

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: PrismaService,
          useValue: {
            workItem: { findMany: jest.fn().mockResolvedValue([]) },
            project: { findMany: jest.fn().mockResolvedValue([]) },
            kpiRecord: { findMany: jest.fn().mockResolvedValue([]) },
            leaveRequest: { findMany: jest.fn().mockResolvedValue([]) },
          },
        },
      ],
    }).compile();

    service = module.get(AiService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  it('UTC-F036-001 — returns reply from Groq', async () => {
    const result = await service.chat({ message: 'Hello', history: [] }, mockUser);
    expect(result).toEqual({ reply: 'Mock reply' });
  });

  it('UTC-F036-002 — throws InternalServerErrorException on Groq error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'Service unavailable' });
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
    mockFetch.mockClear();
    const history = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'assistant' as const, content: 'Hello' },
    ];
    await service.chat({ message: 'follow up', history }, mockUser);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[1]).toMatchObject({ role: 'user', content: 'Hi' });
    expect(body.messages[2]).toMatchObject({ role: 'assistant', content: 'Hello' });
  });

  it('UTC-F036-007 — does not fetch work items for unrelated message', async () => {
    await service.chat({ message: 'what is my kpi score', history: [] }, mockUser);
    expect(prisma.workItem.findMany).not.toHaveBeenCalled();
  });

  it('UTC-F036-008 — fetches projects when message mentions project', async () => {
    await service.chat({ message: 'show my projects', history: [] }, mockUser);
    expect(prisma.project.findMany).toHaveBeenCalled();
  });
});

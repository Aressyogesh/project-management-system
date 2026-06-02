import { apiClient } from './client';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiSource {
  type: 'work_item' | 'project' | 'sprint' | 'milestone' | 'board';
  id: string;
  title: string;
  url?: string;
}

export interface ChatRequest {
  message: string;
  projectId?: string;
  conversationId?: string;
  history?: ConversationTurn[];
}

export interface ChatResponse {
  answer: string;
  sources: AiSource[];
  toolsUsed: string[];
  conversationId: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  ollama: { reachable: boolean; model: string };
  version: string;
}

export const aiApi = {
  chat: (data: ChatRequest) =>
    apiClient.post<ChatResponse>('/ai/chat', data).then((r) => r.data),

  health: () =>
    apiClient.get<HealthResponse>('/ai/health').then((r) => r.data),
};

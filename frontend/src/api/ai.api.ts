import { apiClient } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export type ActionIntent =
  | { type: 'UPDATE_TASK_STATUS'; workItemId: string; displayId: string; title: string; newStatus: string; label: string }
  | { type: 'LOG_TIMESHEET'; workItemId: string; displayId: string; title: string; hours: number; date: string; label: string }
  | { type: 'SUBMIT_LEAVE'; leaveType: string; startDate: string; endDate: string; reason: string; label: string };

export interface ChatResponse {
  reply: string;
  action?: ActionIntent;
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>('/ai/chat', req);
  return data;
}

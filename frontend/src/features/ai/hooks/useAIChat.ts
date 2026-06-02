import { useState, useCallback, useRef } from 'react';
import { aiApi, AiSource, ConversationTurn } from '../../../api/ai.api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AiSource[];
  toolsUsed?: string[];
  timestamp: Date;
}

export function useAIChat(projectId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const history: ConversationTurn[] = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await aiApi.chat({
        message: text.trim(),
        projectId,
        conversationId: conversationIdRef.current,
        history,
      });

      conversationIdRef.current = res.conversationId;

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        toolsUsed: res.toolsUsed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, projectId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    conversationIdRef.current = undefined;
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}

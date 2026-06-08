import { useState, useCallback } from 'react';
import { sendChatMessage, ChatMessage, ActionIntent } from '../../../api/ai.api';

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionIntent | undefined>();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const isGreet = text.startsWith('__greet__');
    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = isGreet ? [] : messages;
    const nextMessages = isGreet ? messages : [...messages, userMsg];

    if (!isGreet) setMessages(nextMessages);
    setLoading(true);

    try {
      const { reply, action } = await sendChatMessage({ message: text, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (action) setPendingAction(action);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'AI service is currently unavailable. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearPendingAction = useCallback(() => setPendingAction(undefined), []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setPendingAction(undefined);
  }, []);

  return { messages, loading, pendingAction, sendMessage, appendMessage, clearPendingAction, clearHistory };
}

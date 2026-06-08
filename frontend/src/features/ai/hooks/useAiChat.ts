import { useState, useCallback } from 'react';
import { sendChatMessage, ChatMessage } from '../../../api/ai.api';

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const isGreet = text.startsWith('__greet__');
    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = isGreet ? [] : messages;
    const nextMessages = isGreet ? messages : [...messages, userMsg];

    if (!isGreet) setMessages(nextMessages);
    setLoading(true);

    try {
      const { reply } = await sendChatMessage({ message: text, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'AI service is currently unavailable. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const clearHistory = useCallback(() => setMessages([]), []);

  return { messages, loading, sendMessage, clearHistory };
}

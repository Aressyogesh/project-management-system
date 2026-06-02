import { useRef, useEffect } from 'react';
import { useAIChat } from '../hooks/useAIChat';
import { ChatMessageBubble, TypingIndicator } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';

const SUGGESTED_PROMPTS = [
  'What tasks are overdue?',
  'Show project progress',
  'Who has the highest workload?',
  'Are there any blocked items?',
  'Summarise work completed this week',
  'How many open bugs are critical?',
  'Which milestones are delayed?',
  'What is the sprint velocity?',
];

export function AIAssistantPage() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ask questions about your project data in plain English.</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex flex-col flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center pb-8">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-800">What would you like to know?</p>
                <p className="text-sm text-gray-500 mt-1">I can query your live project data — tasks, sprints, milestones, workload and more.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-sm text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50
                               text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700
                               transition-colors leading-snug"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          placeholder="Ask about tasks, sprints, milestones, or team workload..."
        />
      </div>
    </div>
  );
}

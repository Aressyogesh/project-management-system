import { useState, useRef, useEffect, useCallback } from 'react';
import { useAiChat } from '../hooks/useAiChat';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useVoiceOutput } from '../hooks/useVoiceOutput';
import { ChatMessage } from './ChatMessage';

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);
const MicIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);
const MicOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
  </svg>
);
const VolumeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const VolumeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

interface Props {
  onClose: () => void;
  userName: string;
  greetOnMount: boolean;
}

const SUGGESTIONS = [
  'What are my overdue tasks?',
  'Summarise my projects',
  'What is my KPI score this month?',
];

export function AiAssistantPanel({ onClose, userName, greetOnMount }: Props) {
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { messages, loading, sendMessage, clearHistory } = useAiChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const greetedRef = useRef(false);

  const { speak, stop: stopSpeech } = useVoiceOutput();

  const handleTranscript = useCallback((text: string) => {
    setInput(text);
  }, []);

  const { listening, supported: micSupported, startListening, stopListening } = useVoiceInput(handleTranscript);

  useEffect(() => {
    if (greetOnMount && !greetedRef.current) {
      greetedRef.current = true;
      const firstName = userName.split(' ')[0];
      sendMessage(`__greet__${firstName}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (voiceEnabled && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant') speak(last.content);
    }
  }, [messages, voiceEnabled, speak]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled) stopSpeech();
    setVoiceEnabled((v) => !v);
  };

  const visibleMessages = messages.filter((m) => !m.content.startsWith('__greet__'));
  const firstName = userName.split(' ')[0];

  return (
    <div className="fixed bottom-20 right-5 w-[360px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">AI</div>
          <div>
            <p className="font-semibold text-sm leading-tight">PMS Assistant</p>
            <p className="text-[11px] text-purple-200">Tasks · Projects · KPIs</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={toggleVoice} title={voiceEnabled ? 'Mute' : 'Read aloud'} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            {voiceEnabled ? <VolumeIcon /> : <VolumeOffIcon />}
          </button>
          <button onClick={clearHistory} title="Clear chat" className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <TrashIcon />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {visibleMessages.length === 0 && !loading && (
          <div className="text-center mt-6 space-y-1">
            <p className="text-2xl">👋</p>
            <p className="font-semibold text-gray-700 text-sm">Hi, {firstName}!</p>
            <p className="text-xs text-gray-400">Ask me anything about the PMS.</p>
            <div className="mt-4 space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-primary-50 hover:text-primary-700 rounded-xl text-xs transition-colors border border-gray-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {visibleMessages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 mt-1">AI</div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
        {micSupported && (
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            title="Hold to speak"
            className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
              listening ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-primary-50 hover:text-primary-600'
            }`}
          >
            {listening ? <MicOffIcon /> : <MicIcon />}
          </button>
        )}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:opacity-50 transition"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

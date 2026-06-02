import { useState } from 'react';
import { AIChatWindow } from './AIChatWindow';

export function AIChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="AI Assistant"
        className={`fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full shadow-lg flex items-center justify-center
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2
                    ${open ? 'bg-gray-700 hover:bg-gray-800' : 'bg-primary-600 hover:bg-primary-700'}`}
        style={{ width: '52px', height: '52px' }}
      >
        {open ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[360px] h-[520px] rounded-2xl shadow-2xl border border-gray-200
                     flex flex-col overflow-hidden bg-white
                     animate-in slide-in-from-bottom-4 fade-in duration-200"
        >
          <AIChatWindow onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export function GlobalProgressBar() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] h-0.5 transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      <div className="h-full bg-primary-500 animate-progress-bar" />
      <style>{`
        @keyframes progress-bar {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(-10%); }
          100% { transform: translateX(0%); }
        }
        .animate-progress-bar {
          animation: progress-bar 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

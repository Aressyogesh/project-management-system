import { CardColor, TrendDirection } from '../../../types/dashboard.types';

interface StatCardProps {
  label: string;
  value: number;
  change: number;
  trend: TrendDirection;
  color: CardColor;
}

const colorMap: Record<CardColor, {
  cardBg: string;
  valueTxt: string;
  bar: string;
  barTrack: string;
  Icon: () => JSX.Element;
}> = {
  blue: {
    cardBg: '#E5ECFF',
    valueTxt: '#1565C0',
    bar: '#1976D2',
    barTrack: '#BBDEFB',
    // Gear / settings icon — matches "All Projects" in design
    Icon: () => (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  rose: {
    cardBg: '#FFE7E9',
    valueTxt: '#C62828',
    bar: '#E53935',
    barTrack: '#FFCDD2',
    // Clipboard + clock — matches "Total Tasks" in design
    Icon: () => (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h6m6-7V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M17 14a3 3 0 100 6 3 3 0 000-6zm0 0V11" />
      </svg>
    ),
  },
  purple: {
    cardBg: '#FFF0D7',
    valueTxt: '#E65100',
    bar: '#FB8C00',
    barTrack: '#FFE0B2',
    // Group of people — matches "Total Users" in design
    Icon: () => (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M17 20h5v-2a4 4 0 00-5-3.87M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a4 4 0 015-3.87M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7.008 9.5a3 3 0 105.992 0" />
      </svg>
    ),
  },
  green: {
    cardBg: '#E3FFF1',
    valueTxt: '#00695C',
    bar: '#00897B',
    barTrack: '#B2DFDB',
    // Document with checkmark — matches "Completed Tasks" in design
    Icon: () => (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M9 12l2 2 4-4M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" />
      </svg>
    ),
  },
};

export function StatCard({ label, value, color }: StatCardProps) {
  const c = colorMap[color];
  const pct = value > 0 ? Math.min(Math.round((value / (value * 1.5)) * 100), 100) : 0;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: c.cardBg, border: '1px solid #cccccc' }}
    >
      {/* Label + icon row */}
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-700 leading-tight">{label}</p>
        <span style={{ color: c.bar }}><c.Icon /></span>
      </div>

      {/* Value */}
      <p className="text-[2.6rem] font-bold tabular-nums leading-none" style={{ color: c.valueTxt }}>
        {String(value).padStart(2, '0')}
      </p>

      {/* Progress bar */}
      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: c.barTrack }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: c.bar }}
        />
      </div>
    </div>
  );
}

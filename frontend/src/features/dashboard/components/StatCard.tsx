import { CardColor, TrendDirection } from '../../../types/dashboard.types';

interface StatCardProps {
  label: string;
  value: number;
  change: number;
  trend: TrendDirection;
  color: CardColor;
}

const colorMap: Record<CardColor, { bar: string; bg: string; badge: string }> = {
  green:  { bar: 'bg-green-500',    bg: 'bg-green-100',    badge: 'text-green-700 bg-green-50 border-green-200' },
  blue:   { bar: 'bg-blue-500',     bg: 'bg-blue-100',     badge: 'text-blue-700 bg-blue-50 border-blue-200' },
  purple: { bar: 'bg-primary-600',  bg: 'bg-primary-100',  badge: 'text-primary-700 bg-primary-50 border-primary-200' },
  rose:   { bar: 'bg-rose-500',     bg: 'bg-rose-100',     badge: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export function StatCard({ label, value, change, trend, color }: StatCardProps) {
  const c = colorMap[color];
  const isUp = trend === 'up';
  const pct = value > 0 ? Math.min(Math.round((value / (value * 1.5)) * 100), 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {change !== 0 && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
            {isUp ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17l10-10M7 7h10v10" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 7L7 17M7 17h10V7" />
              </svg>
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>

      <p className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </p>

      <div className={`h-2 rounded-full ${c.bg} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${c.bar} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

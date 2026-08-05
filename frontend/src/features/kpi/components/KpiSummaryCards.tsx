import type { KpiTeamSummary } from '../../../types/kpi.types';
import { GRADE_CONFIG } from '../data/kpiStaticData';

interface Props {
  summary: KpiTeamSummary;
}

export function KpiSummaryCards({ summary }: Props) {
  const { teamGrade } = summary;
  const gradeStyle = GRADE_CONFIG[teamGrade];

  const cards = [
    {
      label: 'Team Average',
      value: summary.teamAverage.toFixed(1),
      sub: `Grade ${teamGrade} — ${gradeStyle.label}`,
      accent: gradeStyle.color,
      bg: gradeStyle.bg,
      text: gradeStyle.text,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'Grade A',
      value: summary.gradeACcount.toString(),
      sub: 'Excellent (90+)',
      accent: '#10B981',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      label: 'Grade B',
      value: summary.gradeBCount.toString(),
      sub: 'Good (75–89)',
      accent: '#3B82F6',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: 'Grade C / D',
      value: (summary.gradeCCount + summary.gradeDCount).toString(),
      sub: `C: ${summary.gradeCCount} · D: ${summary.gradeDCount} employees`,
      accent: '#F59E0B',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl border border-[#cccccc] p-5 flex flex-col gap-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {card.label}
            </span>
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}
              style={{ color: card.accent }}>
              {card.icon}
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className={`text-xs mt-1 font-medium ${card.text}`}>{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

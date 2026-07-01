import type { EmployeeKpiRecord } from '../../../types/kpi.types';
import { GRADE_CONFIG } from '../data/kpiStaticData';

interface Props {
  employees: EmployeeKpiRecord[];
}

const RANK_STYLES = [
  'bg-amber-400 text-white',
  'bg-gray-300 text-gray-700',
  'bg-orange-300 text-white',
  'bg-gray-100 text-gray-600',
  'bg-gray-100 text-gray-600',
];

export function KpiLeaderboard({ employees }: Props) {
  const top5 = [...employees].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Top Performers</h3>
        <p className="text-xs text-gray-400 mt-0.5">Ranked by total KPI score</p>
      </div>

      <div className="space-y-2.5">
        {top5.map((emp, idx) => {
          const grade = GRADE_CONFIG[emp.grade];
          const initials = emp.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div key={emp.userId} className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${RANK_STYLES[idx] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {idx + 1}
              </span>

              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-semibold">{initials}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                <p className="text-xs text-gray-400 truncate">{emp.role}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-gray-900">{emp.totalScore}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grade.bg} ${grade.text}`}>
                  {emp.grade}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

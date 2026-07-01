import type { EmployeeKpiRecord } from '../../../types/kpi.types';
import { KPI_METRICS, KPI_CATEGORIES, GRADE_CONFIG } from '../data/kpiStaticData';
import { KpiRadarChart } from './KpiRadarChart';

interface Props {
  employee: EmployeeKpiRecord;
}

const CAT_COLORS: Record<string, string> = {
  'Delivery & Execution': '#3B82F6',
  'Quality & Engineering Excellence': '#10B981',
  'Ownership & Collaboration': '#8B5CF6',
  'Growth & Innovation': '#F59E0B',
  'Behaviour & Reliability': '#EC4899',
};

export function KpiEmployeeDetailPanel({ employee }: Props) {
  const grade = GRADE_CONFIG[employee.grade];

  return (
    <div className="bg-gray-50 border-t border-gray-100 p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Radar chart */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">{employee.name}</p>
              <p className="text-xs text-gray-400">{employee.role} · {employee.department}</p>
            </div>
            <div className="text-right">
              {employee.hasNoActivity ? (
                <>
                  <p className="text-2xl font-bold text-gray-400">—</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    N/A — No Data
                  </span>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{employee.totalScore}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grade.bg} ${grade.text}`}>
                    Grade {employee.grade} — {grade.label}
                  </span>
                </>
              )}
            </div>
          </div>
          {employee.hasNoActivity ? (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
              <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0122 9.414V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs text-gray-400 font-medium">No activity this period</p>
              <p className="text-[10px] text-gray-300">Assign work items to start tracking KPI</p>
            </div>
          ) : (
            <KpiRadarChart categoryScores={employee.categoryScores} name={employee.name} />
          )}
        </div>
      </div>

      {/* Right: All 13 metrics grouped by category */}
      <div className="lg:col-span-2 space-y-4">
        {KPI_CATEGORIES.map((cat) => {
          const catMetrics = KPI_METRICS.filter((m) => (m.subCategory ?? m.coreValue) === cat.name);
          const catScore = employee.categoryScores.find((c) => c.category === cat.name);
          const color = CAT_COLORS[cat.name] ?? '#6B7280';

          return (
            <div key={cat.name} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {cat.name}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${catScore?.percentage ?? 0}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-800 w-16 text-right">
                    {catScore?.earned ?? 0}/{cat.max} pts
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {catMetrics.map((metric) => {
                  const metricScore = employee.metrics.find((s) => s.metricId === metric.id);
                  const points = metricScore?.points ?? 0;
                  const pct = Math.round((points / metric.maxPoints) * 100);

                  return (
                    <div key={metric.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs text-gray-600 font-medium truncate">
                            {metric.name}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0 hidden sm:inline">
                            — {metric.scoringDescription}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 shrink-0 ml-2">
                          {points}/{metric.maxPoints}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                pct >= 80
                                  ? '#10B981'
                                  : pct >= 60
                                  ? '#3B82F6'
                                  : pct >= 40
                                  ? '#F59E0B'
                                  : '#EF4444',
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

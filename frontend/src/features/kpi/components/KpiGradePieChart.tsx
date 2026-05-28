import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { KpiTeamSummary } from '../../../types/kpi.types';

interface Props {
  summary: KpiTeamSummary;
}

const GRADE_SLICES = [
  { grade: 'A', label: 'Grade A (90+)',   color: '#10B981' },
  { grade: 'B', label: 'Grade B (75–89)', color: '#3B82F6' },
  { grade: 'C', label: 'Grade C (60–74)', color: '#F59E0B' },
  { grade: 'D', label: 'Grade D (<60)',   color: '#EF4444' },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { label: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800">{payload[0].payload.label}</p>
      <p className="text-gray-500 mt-0.5">
        {payload[0].value} employee{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function KpiGradePieChart({ summary }: Props) {
  const counts: Record<string, number> = {
    A: summary.gradeACcount,
    B: summary.gradeBCount,
    C: summary.gradeCCount,
    D: summary.gradeDCount,
  };

  const data = GRADE_SLICES.filter((s) => counts[s.grade] > 0).map((s) => ({
    name: s.grade,
    label: s.label,
    value: counts[s.grade],
    color: s.color,
  }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Grade Distribution</h3>
        <p className="text-xs text-gray-400 mt-0.5">{total} employees this period</p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-2 mt-2">
        {GRADE_SLICES.map((s) => (
          <div key={s.grade} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-600 truncate">
              {s.grade} — <span className="font-semibold text-gray-800">{counts[s.grade]}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

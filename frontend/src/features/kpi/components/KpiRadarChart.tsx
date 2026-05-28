import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { EmployeeKpiRecord } from '../../../types/kpi.types';

interface Props {
  employee: EmployeeKpiRecord;
}

const SHORT_CATEGORY: Record<string, string> = {
  'Delivery & Execution': 'D & E',
  'Quality & Engineering Excellence': 'Q & E',
  'Ownership & Collaboration': 'O & C',
  'Growth & Innovation': 'G & I',
  'Behaviour & Reliability': 'B & R',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { fullName: string; earned: number; max: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{d.fullName}</p>
      <p className="text-gray-600">
        Score: <span className="font-bold text-gray-900">{d.earned}/{d.max}</span>{' '}
        <span className="text-gray-400">({payload[0].value}%)</span>
      </p>
    </div>
  );
}

export function KpiRadarChart({ employee }: Props) {
  const data = employee.categoryScores.map((c) => ({
    category: SHORT_CATEGORY[c.category] ?? c.category,
    fullName: c.category,
    score: c.percentage,
    earned: c.earned,
    max: c.max,
  }));

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            tickCount={5}
          />
          <Radar
            name={employee.name}
            dataKey="score"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.18}
            strokeWidth={2}
            dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      <div className="w-full grid grid-cols-5 gap-1 mt-1">
        {employee.categoryScores.map((c) => (
          <div key={c.category} className="text-center">
            <p className="text-xs font-bold text-gray-800">{c.percentage}%</p>
            <p className="text-[10px] text-gray-400 leading-tight">
              {SHORT_CATEGORY[c.category] ?? c.category}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

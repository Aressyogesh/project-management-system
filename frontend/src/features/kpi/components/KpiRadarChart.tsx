import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { KpiCategoryScore } from '../../../types/kpi.types';

interface Props {
  categoryScores: KpiCategoryScore[];
  name: string;
  color?: string;
}

const SHORT_LABEL: Record<string, string> = {
  'Diligent and Committed': 'Diligent',
  'Collaboration':          'Collab.',
  'Continuous Learning':    'Learning',
  'Optimism':               'Optimism',
  'Gratitude':              'Gratitude',
  // legacy sub-category labels (kept for backward compat)
  'Delivery & Execution':           'D & E',
  'Quality & Engineering Excellence': 'Q & E',
  'Attendance':                       'Attendance',
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

export function KpiRadarChart({ categoryScores, name, color = '#3B82F6' }: Props) {
  const data = categoryScores.map((c) => ({
    category: SHORT_LABEL[c.category] ?? c.category,
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
            name={name}
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.18}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      <div className="w-full flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
        {categoryScores.map((c) => (
          <div key={c.category} className="text-center min-w-[60px]">
            <p className="text-xs font-bold text-gray-800">{c.percentage}%</p>
            <p className="text-[10px] text-gray-400 leading-tight">
              {SHORT_LABEL[c.category] ?? c.category}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

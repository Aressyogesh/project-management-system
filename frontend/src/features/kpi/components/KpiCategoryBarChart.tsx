import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { KpiCategoryScore } from '../../../types/kpi.types';
import { KPI_CATEGORIES } from '../data/kpiStaticData';

interface Props {
  categoryAverages: KpiCategoryScore[];
}

const SHORT_NAMES: Record<string, string> = {
  'Delivery & Execution': 'D & E',
  'Quality & Engineering Excellence': 'Q & E',
  'Ownership & Collaboration': 'O & C',
  'Growth & Innovation': 'G & I',
  'Behaviour & Reliability': 'B & R',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const cat = KPI_CATEGORIES.find((c) => SHORT_NAMES[c.name] === label || c.name === label);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{cat?.name ?? label}</p>
      <p className="text-gray-600">
        Avg Score: <span className="font-bold text-gray-900">{payload[0].value}%</span>
      </p>
    </div>
  );
}

export function KpiCategoryBarChart({ categoryAverages }: Props) {
  const chartData = categoryAverages.map((c) => ({
    name: SHORT_NAMES[c.category] ?? c.category,
    fullName: c.category,
    score: c.percentage,
    color: KPI_CATEGORIES.find((k) => k.name === c.category)?.color ?? '#6B7280',
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Team Category Performance</h3>
        <p className="text-xs text-gray-400 mt-0.5">Average score per category as % of maximum</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }} barSize={40}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {KPI_CATEGORIES.map((cat) => (
          <div key={cat.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="text-xs text-gray-500">{SHORT_NAMES[cat.name]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

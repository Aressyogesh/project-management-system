import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cell, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { dashboardApi } from '../../../api/dashboard.api';

interface TasksProgressChartProps {
  projectId?: string;
}

type Period = '7d' | '30d' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d',  label: 'Last 7 Days'  },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time'     },
];

const SEGMENTS = [
  { key: 'notStarted', label: 'Not Started', color: '#3b82f6' },
  { key: 'inProgress', label: 'In Progress',  color: '#06b6d4' },
  { key: 'onReview',   label: 'On Review',    color: '#f59e0b' },
  { key: 'completed',  label: 'Completed',    color: '#10b981' },
] as const;

export function TasksProgressChart({ projectId }: TasksProgressChartProps) {
  const [period, setPeriod] = useState<Period>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks-progress', projectId ?? '', period],
    queryFn:  () => dashboardApi.getTasksProgress({ projectId, period }),
    staleTime: 60_000,
  });

  const counts = data ?? { notStarted: 0, inProgress: 0, onReview: 0, completed: 0 };
  const total  = counts.notStarted + counts.inProgress + counts.onReview + counts.completed;

  const chartData = SEGMENTS.map(({ key, label, color }) => ({
    name:  label,
    value: total > 0 ? Math.round((counts[key] / total) * 100) : 0,
    count: counts[key],
    fill:  color,
  }));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#cccccc]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 text-base">Tasks Progress</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="h-[120px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <ResponsiveContainer width={120} height={120}>
              <RadialBarChart innerRadius={22} outerRadius={58} data={chartData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f1f5f9' }}>
                  {chartData.map((_entry, i) => (
                    <Cell key={i} fill={SEGMENTS[i].color} />
                  ))}
                </RadialBar>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-2.5">
            {SEGMENTS.map(({ label, color }, i) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs text-gray-600 truncate">{label}</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-xs font-semibold text-gray-800">{chartData[i].value}%</span>
                  <span className="text-[10px] text-gray-400 ml-1">({chartData[i].count})</span>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-gray-400 pt-1">{total} total work items</p>
          </div>
        </div>
      )}
    </div>
  );
}

import { Cell, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { TasksProgress } from '../../../types/dashboard.types';

interface TasksProgressChartProps {
  data: TasksProgress;
}

const SEGMENTS = [
  { key: 'notStarted',  label: 'Not Started', color: '#3b82f6' },
  { key: 'inProgress',  label: 'In Progress',  color: '#06b6d4' },
  { key: 'onReview',    label: 'On Review',    color: '#f59e0b' },
  { key: 'completed',   label: 'Completed',    color: '#10b981' },
] as const;

export function TasksProgressChart({ data }: TasksProgressChartProps) {
  const total = data.notStarted + data.inProgress + data.onReview + data.completed;

  const chartData = SEGMENTS.map(({ key, label, color }) => ({
    name: label,
    value: total > 0 ? Math.round((data[key] / total) * 100) : 0,
    fill: color,
  }));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 text-base">Tasks Progress</h2>
        <select className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>All Time</option>
        </select>
      </div>

      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <ResponsiveContainer width={120} height={120}>
            <RadialBarChart
              innerRadius={22}
              outerRadius={58}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={4}
                background={{ fill: '#f1f5f9' }}
              >
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
              <span className="text-xs font-semibold text-gray-800 tabular-nums">
                {chartData[i].value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

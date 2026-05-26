import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ActivityPoint } from '../../../types/dashboard.types';

interface ActivityChartProps {
  data: ActivityPoint[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-gray-800 text-base">Team Activity Summary</h2>
        <select className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
          <option>Monthly</option>
          <option>Weekly</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: 'none',
              borderRadius: '10px',
              color: '#f8fafc',
              fontSize: '12px',
              padding: '8px 12px',
            }}
            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '12px' }}
          />
          <Bar dataKey="high" name="High" fill="#f97316" radius={[4, 4, 0, 0]} />
          <Bar dataKey="low" name="Low" fill="#fed7aa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

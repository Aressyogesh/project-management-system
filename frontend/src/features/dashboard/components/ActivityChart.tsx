import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
import { dashboardApi } from '../../../api/dashboard.api';
import { ActivityPoint } from '../../../types/dashboard.types';

interface ActivityChartProps {
  data: ActivityPoint[];     // monthly data already fetched by the page
  projectId?: string;
}

export function ActivityChart({ data, projectId }: ActivityChartProps) {
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');

  const { data: weeklyData, isLoading } = useQuery({
    queryKey: ['activity-weekly', projectId],
    queryFn:  () => dashboardApi.getActivityData({ projectId, period: 'weekly' }),
    enabled:  period === 'weekly',
    staleTime: 60_000,
  });

  const chartData = period === 'monthly' ? data : (weeklyData ?? []);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-gray-800 text-base">Work Item Activity</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'monthly' | 'weekly')}
          className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={2} barCategoryGap="35%">
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
              allowDecimals={false}
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
            <Bar dataKey="high" name="Created"   fill="#f97316" radius={[4, 4, 0, 0]} minPointSize={3} />
            <Bar dataKey="low"  name="Completed" fill="#fed7aa" radius={[4, 4, 0, 0]} minPointSize={3} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboard.api';
import { useAuthStore } from '../../../store/authStore';
import { ActivityChart } from '../components/ActivityChart';
import { MyTaskTable } from '../components/MyTaskTable';
import { StatCard } from '../components/StatCard';
import { TasksProgressChart } from '../components/TasksProgressChart';
import { TodayTaskWidget } from '../components/TodayTaskWidget';

const roleLabel: Record<string, string> = {
  SUPER_USER: 'Super User',
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 h-36 border border-gray-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl h-72 border border-gray-100" />
        <div className="bg-white rounded-2xl h-72 border border-gray-100" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl h-64 border border-gray-100" />
        <div className="bg-white rounded-2xl h-64 border border-gray-100" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    staleTime: 60_000,
  });

  if (isLoading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm text-gray-400">Unable to load dashboard data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          {roleLabel[user?.systemRole ?? 'EMPLOYEE']} Dashboard
        </span>
      </div>

      {/* Stat Cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data.cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Middle row: Activity Chart + Right Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ActivityChart data={data.activityData} />
        </div>
        <div className="xl:col-span-1">
          <TodayTaskWidget
            todayTask={data.todayTask}
            teamPerformance={data.teamPerformance}
          />
        </div>
      </div>

      {/* Bottom row: Task Table + Progress Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <MyTaskTable tasks={data.myTasks} />
        </div>
        <div className="xl:col-span-1">
          <TasksProgressChart data={data.tasksProgress} />
        </div>
      </div>
    </div>
  );
}

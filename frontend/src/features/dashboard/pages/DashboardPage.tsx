import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { dashboardApi } from '../../../api/dashboard.api';
import { projectsApi } from '../../../api/projects.api';
import { useAuthStore } from '../../../store/authStore';
import { ActivityChart } from '../components/ActivityChart';
import { AnnouncementsWidget } from '../components/AnnouncementsWidget';
import { MyTaskTable } from '../components/MyTaskTable';
import { ProjectProgressPanel } from '../components/ProjectProgressPanel';
import { StatCard } from '../components/StatCard';
import { TasksProgressChart } from '../components/TasksProgressChart';
import { TeamActivityPanel } from '../components/TeamActivityPanel';

// ── Helpers ────────────────────────────────────────────────────────────────────

function toYearMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function buildMonthOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return toYearMonth(d);
  });
}

const MONTH_OPTIONS = buildMonthOptions();

// ── Loading skeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-white rounded-2xl border border-gray-100 w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 h-36 border border-gray-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl h-72 border border-gray-100" />
        <div className="bg-white rounded-2xl h-72 border border-gray-100" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdminOrSuper = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth,   setSelectedMonth]   = useState(MONTH_OPTIONS[0]);

  // Admin/Super: fetch all active projects for the filter dropdown
  const { data: adminProjects = [], isLoading: adminProjectsLoading } = useQuery({
    queryKey: ['projects-list', 'active'],
    queryFn:  () => projectsApi.list({ status: 'ACTIVE' }),
    enabled:  isAdminOrSuper,
    staleTime: 120_000,
  });

  // Projects progress — always fetch; backend scopes to PM/TL's own projects for non-admins
  const { data: projectsProgress, isLoading: projectsLoading2 } = useQuery({
    queryKey: ['dashboard-projects-progress'],
    queryFn:  dashboardApi.getProjectsProgress,
    staleTime: 60_000,
  });

  // PM/TL detection: backend returns project data only for PM/TL roles
  const isManager = isAdminOrSuper || ((projectsProgress?.length ?? 0) > 0);

  // Filter dropdown: admins see all projects; PMs/TLs see only their own (from projectsProgress)
  const projects = isAdminOrSuper
    ? adminProjects
    : (projectsProgress ?? []).map((p) => ({ id: p.id, name: p.name }));
  const projectsLoading = isAdminOrSuper ? adminProjectsLoading : projectsLoading2;
  const hasFilter = isManager && !!selectedProject;

  // Dashboard stats — scoped when project+month selected
  const statsParams = hasFilter ? { projectId: selectedProject, month: selectedMonth } : undefined;
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', selectedProject, selectedMonth],
    queryFn:  () => dashboardApi.getStats(statsParams),
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

  const selectedProjectName = projects.find((p: any) => p.id === selectedProject)?.name ?? '';

  return (
    <div className="space-y-6">

      {/* ── Top filter bar (Admin / Super User / Project Manager / Team Lead) ─ */}
      {isManager && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
          {/* Project selector */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 7h18M3 12h18M3 17h18" />
            </svg>
            <select
              className="flex-1 text-sm text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer font-medium"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={projectsLoading}
            >
              <option value="">{projectsLoading ? 'Loading…' : 'All Projects'}</option>
              {(projects as any[]).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Month selector */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <select
              className="text-sm text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer font-medium"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* Active filter badge */}
          {hasFilter && (
            <>
              <div className="w-px h-5 bg-gray-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs bg-primary-50 text-primary-700 border border-primary-100 px-2.5 py-1 rounded-full font-medium">
                  {selectedProjectName} — {monthLabel(selectedMonth)}
                </span>
                <button
                  onClick={() => setSelectedProject('')}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear filter"
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data.cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Activity Chart ─────────────────────────────────────────────────── */}
      <ActivityChart data={data.activityData} projectId={selectedProject || undefined} />

      {/* ── Projects Progress (Admin/Super/PM/TL, only when no project filter) ─ */}
      {isManager && !hasFilter && (
        <div>
          {projectsLoading2 ? (
            <div className="animate-pulse">
              <div className="h-6 w-40 bg-gray-100 rounded mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl h-40 border border-gray-100" />
                ))}
              </div>
            </div>
          ) : (
            <ProjectProgressPanel projects={projectsProgress ?? []} />
          )}
        </div>
      )}

      {/* ── Team Activity (Admin/Super/PM, only when project is selected) ───── */}
      {hasFilter && (
        <TeamActivityPanel projectId={selectedProject} month={selectedMonth} />
      )}

      {/* ── My Tasks + Task Progress Chart ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <MyTaskTable tasks={data.myTasks} />
        </div>
        <div className="xl:col-span-1">
          <TasksProgressChart projectId={selectedProject || undefined} />
        </div>
      </div>

      {/* ── Announcements ──────────────────────────────────────────────────── */}
      <AnnouncementsWidget projectId={selectedProject || undefined} month={selectedMonth} />
    </div>
  );
}

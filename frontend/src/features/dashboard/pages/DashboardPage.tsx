import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { dashboardApi } from '../../../api/dashboard.api';
import { projectsApi } from '../../../api/projects.api';
import { useAuthStore } from '../../../store/authStore';
import { AnnouncementsWidget } from '../components/AnnouncementsWidget';
import { CelebrationBanner } from '../components/CelebrationBanner';
import { ProjectProgressPanel } from '../components/ProjectProgressPanel';
import { StatCard } from '../components/StatCard';
import { TeamActivityPanel } from '../components/TeamActivityPanel';
import { ProjectRiskScoreCard } from '../components/ProjectRiskScoreCard';
import { MemberActivity } from '../../../types/dashboard.types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function toYearMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
      <div className="h-10 bg-white rounded-2xl border border-[#cccccc] w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 h-36 border border-[#cccccc]" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-40 border border-[#cccccc]" />
        ))}
      </div>
    </div>
  );
}

// ── Project Combobox ───────────────────────────────────────────────────────────

function ProjectCombobox({
  projects,
  selected,
  onSelect,
  loading,
}: {
  projects: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedName = projects.find((p) => p.id === selected)?.name ?? '';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  const displayValue = open ? search : (selectedName ? toTitleCase(selectedName) : '');

  return (
    <div ref={containerRef} className="relative flex items-center gap-2 flex-1 min-w-[200px]">
      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 7h18M3 12h18M3 17h18" />
      </svg>
      <input
        type="text"
        placeholder={loading ? 'Loading…' : 'All Projects'}
        value={displayValue}
        disabled={loading}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 text-sm text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 font-medium placeholder:text-gray-400 placeholder:font-normal cursor-pointer"
      />
      {selected && !open && (
        <button
          onMouseDown={(e) => { e.preventDefault(); onSelect(''); setSearch(''); }}
          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
          title="Clear"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {!selected && !open && (
        <svg className="w-4 h-4 text-gray-300 shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      )}

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-auto">
          <div
            onMouseDown={() => { onSelect(''); setSearch(''); setOpen(false); }}
            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${!selected ? 'text-primary-600 font-medium' : 'text-gray-400'}`}
          >
            All Projects
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 italic">No projects found</div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                onMouseDown={() => { onSelect(p.id); setSearch(''); setOpen(false); }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-700 ${
                  selected === p.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                }`}
              >
                {toTitleCase(p.name)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Team Activity + Risk Score wrapper ─────────────────────────────────────────

function TeamActivitySection({ projectId, month }: { projectId: string; month: string }) {
  const { data: activity = [] } = useQuery<MemberActivity[]>({
    queryKey: ['team-activity', projectId, month],
    queryFn: () => dashboardApi.getTeamActivity(projectId, month),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      <ProjectRiskScoreCard activity={activity} />
      <TeamActivityPanel projectId={projectId} month={month} />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdminOrSuper = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';
  const [searchParams] = useSearchParams();

  const [selectedProject, setSelectedProject] = useState(searchParams.get('projectId') ?? '');
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

  // Non-admin / non-PM/TL members: fetch their own project memberships
  const isManager = isAdminOrSuper || ((projectsProgress?.length ?? 0) > 0);
  const { data: memberProjects = [], isLoading: memberProjectsLoading } = useQuery({
    queryKey: ['projects-list', 'member'],
    queryFn:  () => projectsApi.list({ status: 'ACTIVE' }),
    enabled:  !isAdminOrSuper,
    staleTime: 120_000,
  });

  // Filter dropdown: admins see all projects; PMs/TLs from projectsProgress; others from membership
  const projects = isAdminOrSuper
    ? adminProjects
    : isManager
      ? (projectsProgress ?? []).map((p) => ({ id: p.id, name: p.name }))
      : memberProjects.map((p) => ({ id: p.id, name: p.name }));
  const projectsLoading = isAdminOrSuper ? adminProjectsLoading : isManager ? projectsLoading2 : memberProjectsLoading;
  const canSeeTeamActivity = isManager || memberProjects.length > 0;
  const hasFilter = canSeeTeamActivity && !!selectedProject;

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

  const selectedProjectName = (projects as any[]).find((p) => p.id === selectedProject)?.name ?? '';

  return (
    <div className="space-y-6">

      {/* ── Celebration Banner ─────────────────────────────────────────────── */}
      <CelebrationBanner />

      {/* ── Top filter bar ──────────────────────────────────────────────────── */}
      {canSeeTeamActivity && (
        <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
          {/* Project combobox */}
          <ProjectCombobox
            projects={projects as { id: string; name: string }[]}
            selected={selectedProject}
            onSelect={setSelectedProject}
            loading={projectsLoading}
          />

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
                  {toTitleCase(selectedProjectName)} — {monthLabel(selectedMonth)}
                </span>
                {isAdminOrSuper && (
                  <Link
                    to={`/projects/${selectedProject}/board`}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
                    title="Open project board"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Board
                  </Link>
                )}
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

      {/* ── Projects Progress (Admin/Super/PM/TL, only when no project filter) ─ */}
      {isManager && !hasFilter && projects.length > 0 && (
        <div>
          {projectsLoading2 ? (
            <div className="animate-pulse">
              <div className="h-6 w-40 bg-gray-100 rounded mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl h-40 border border-[#cccccc]" />
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
        <TeamActivitySection projectId={selectedProject} month={selectedMonth} />
      )}

      {/* ── Announcements ──────────────────────────────────────────────────── */}
      <AnnouncementsWidget projectId={selectedProject || undefined} month={selectedMonth} />
    </div>
  );
}

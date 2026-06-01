import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboard.api';
import { MemberActivity } from '../../../types/dashboard.types';

const roleLabel: Record<string, string> = {
  PROJECT_MANAGER: 'PM',
  TEAM_LEAD: 'TL',
  DEVELOPER: 'Dev',
  QA: 'QA',
  DESIGNER: 'Design',
  DEVOPS: 'DevOps',
};

const roleColor: Record<string, string> = {
  PROJECT_MANAGER: 'bg-violet-100 text-violet-700',
  TEAM_LEAD:       'bg-blue-100 text-blue-700',
  DEVELOPER:       'bg-emerald-100 text-emerald-700',
  QA:              'bg-rose-100 text-rose-700',
  DESIGNER:        'bg-amber-100 text-amber-700',
  DEVOPS:          'bg-slate-100 text-slate-700',
};

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}


function StatCell({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <td className="px-4 py-3 text-center">
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${color}`}>
        {value}
      </span>
      <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">{label}</p>
    </td>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full" />
          <div className="space-y-1">
            <div className="h-3 bg-gray-100 rounded w-24" />
            <div className="h-2 bg-gray-100 rounded w-12" />
          </div>
        </div>
      </td>
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3 text-center">
          <div className="h-8 w-8 bg-gray-100 rounded-full mx-auto" />
        </td>
      ))}
    </tr>
  );
}

function CompletionBar({ assigned, completed }: { assigned: number; completed: number }) {
  const pct = assigned === 0 ? 0 : Math.round((completed / assigned) * 100);
  const color = pct >= 75 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
    </div>
  );
}

interface TeamActivityPanelProps {
  projectId: string;
  month: string;
}

export function TeamActivityPanel({ projectId, month }: TeamActivityPanelProps) {
  const { data: activity = [], isLoading: activityLoading } = useQuery<MemberActivity[]>({
    queryKey: ['team-activity', projectId, month],
    queryFn: () => dashboardApi.getTeamActivity(projectId, month),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const totalHours     = activity.reduce((s, m) => s + m.hoursLogged, 0);
  const totalCompleted = activity.reduce((s, m) => s + m.tasksCompleted, 0);
  const totalBugs      = activity.reduce((s, m) => s + m.bugsReported, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">Team Activity</h3>
        <p className="text-xs text-gray-400 mt-0.5">Per-member breakdown for the selected project and month</p>
      </div>

      {/* Summary chips */}
      {!activityLoading && activity.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-50 flex gap-4 flex-wrap">
          <div className="text-xs text-gray-500">
            <span className="font-semibold text-gray-800">{activity.length}</span> members
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-semibold text-emerald-600">{totalCompleted}</span> tasks completed
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-semibold text-blue-600">{totalHours.toFixed(1)}h</span> logged
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-semibold text-rose-600">{totalBugs}</span> bugs reported
          </div>
        </div>
      )}

      {/* Table */}
      {(
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 font-medium text-gray-500">Member</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-center">Assigned</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-center">Completed</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 min-w-[110px]">Completion</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-center">Hours</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-center">Bugs</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-center">Leave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activityLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : activity.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No team members found for this project.
                  </td>
                </tr>
              ) : (
                activity.map((m) => (
                  <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
                    {/* Member */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 shrink-0">
                          {initials(m.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 leading-tight">{m.name}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${roleColor[m.projectRole] ?? 'bg-gray-100 text-gray-600'}`}>
                            {roleLabel[m.projectRole] ?? m.projectRole}
                          </span>
                        </div>
                      </div>
                    </td>

                    <StatCell value={m.tasksAssigned}  label="assigned"   color="bg-blue-50 text-blue-700" />
                    <StatCell value={m.tasksCompleted} label="completed"  color="bg-emerald-50 text-emerald-700" />

                    {/* Completion bar */}
                    <td className="px-4 py-3">
                      <CompletionBar assigned={m.tasksAssigned} completed={m.tasksCompleted} />
                    </td>

                    <StatCell value={m.hoursLogged}  label="hours"  color="bg-indigo-50 text-indigo-700" />
                    <StatCell value={m.bugsReported} label="bugs"   color="bg-rose-50 text-rose-700" />
                    <StatCell value={m.leaveDays}    label="days"   color={m.leaveDays > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-400'} />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

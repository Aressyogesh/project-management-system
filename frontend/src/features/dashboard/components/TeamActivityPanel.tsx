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
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatCell({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <td className="px-3 py-3 text-center">
      <span className={`inline-flex items-center justify-center min-w-[2rem] px-1.5 h-8 rounded-full text-xs font-semibold ${color}`}>
        {value}
      </span>
      <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">{label}</p>
    </td>
  );
}

function HoursCell({ billable, nonBillable }: { billable: number; nonBillable: number }) {
  return (
    <td className="px-3 py-3 text-center">
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            {billable.toFixed(1)}h
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
            {nonBillable.toFixed(1)}h
          </span>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">B / NB</p>
    </td>
  );
}

function CompletedCell({ delivered, reworked, bugsFixed }: { delivered: number; reworked: number; bugsFixed: number }) {
  return (
    <td className="px-3 py-3 text-center">
      <div className="flex flex-col items-center gap-0.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          {delivered}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          {reworked}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          {bugsFixed}
        </span>
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">D / R / B</p>
    </td>
  );
}

function LeaveCell({ planned, unplanned }: { planned: number; unplanned: number }) {
  const total = planned + unplanned;
  return (
    <td className="px-3 py-3 text-center">
      <div className="flex flex-col items-center gap-0.5">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${planned > 0 ? 'text-blue-700 bg-blue-50' : 'text-gray-400 bg-gray-50'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${planned > 0 ? 'bg-blue-500' : 'bg-gray-300'} shrink-0`} />
          {planned}d
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${unplanned > 0 ? 'text-orange-700 bg-orange-50' : 'text-gray-400 bg-gray-50'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${unplanned > 0 ? 'bg-orange-500' : 'bg-gray-300'} shrink-0`} />
          {unplanned}d
        </span>
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">P / U</p>
      {total === 0 && <p className="text-[10px] text-gray-300 mt-0.5">—</p>}
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
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-3 py-3 text-center">
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

  return (
    <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">Team Activity</h3>
        <p className="text-xs text-gray-400 mt-0.5">Per-member breakdown for the selected project and month</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-2.5 font-medium text-gray-500">Member</th>
              <th className="px-3 py-2.5 font-medium text-gray-500 text-center">Work Item Assigned</th>
              <th className="px-3 py-2.5 font-medium text-gray-500 text-center min-w-[90px]">
                Completed
                <span className="block text-[10px] font-normal text-gray-400">Delivered / Rework / Bug</span>
              </th>
              <th className="px-3 py-2.5 font-medium text-gray-500 min-w-[110px]">Completion</th>
              <th className="px-3 py-2.5 font-medium text-gray-500 text-center min-w-[100px]">
                Hours
                <span className="block text-[10px] font-normal text-gray-400">Billable / Non-Billable</span>
              </th>
              <th className="px-3 py-2.5 font-medium text-gray-500 text-center">Bugs Reported</th>
              <th className="px-3 py-2.5 font-medium text-gray-500 text-center min-w-[80px]">
                Leave
                <span className="block text-[10px] font-normal text-gray-400">Planned / Unplanned</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {activityLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : activity.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No team members found for this project.
                </td>
              </tr>
            ) : (
              activity.map((m) => (
                <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
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

                  <StatCell value={m.tasksAssigned} label="assigned" color="bg-blue-50 text-blue-700" />

                  <CompletedCell delivered={m.delivered} reworked={m.reworked} bugsFixed={m.bugsFixed} />

                  <td className="px-3 py-3">
                    <CompletionBar assigned={m.tasksAssigned} completed={m.tasksCompleted} />
                  </td>

                  <HoursCell billable={m.billableHours} nonBillable={m.nonBillableHours} />

                  <StatCell value={m.bugsReported} label="reported" color="bg-rose-50 text-rose-700" />

                  <LeaveCell planned={m.plannedLeaveDays} unplanned={m.unplannedLeaveDays} />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

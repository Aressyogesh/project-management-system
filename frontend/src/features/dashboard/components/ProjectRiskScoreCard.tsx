import { MemberActivity } from '../../../types/dashboard.types';

interface Props {
  activity: MemberActivity[];
}

function riskLevel(completionPct: number, reworkRatio: number): { label: string; color: string; bg: string; dot: string } {
  if (reworkRatio > 30 || completionPct < 30) return { label: 'High Risk',   color: 'text-red-700',   bg: 'bg-red-50 border-red-200',   dot: 'bg-red-500'   };
  if (reworkRatio > 15 || completionPct < 60) return { label: 'Medium Risk', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
  return                                              { label: 'Low Risk',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
}

function Metric({ label, value, sub, valueColor = 'text-gray-900' }: { label: string; value: string | number; sub?: string; valueColor?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] text-gray-400 font-medium">{label}</p>
      <p className={`text-lg font-bold leading-tight ${valueColor}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

export function ProjectRiskScoreCard({ activity }: Props) {
  if (activity.length === 0) return null;

  const totalAssigned  = activity.reduce((s, m) => s + m.tasksAssigned, 0);
  const totalCompleted = activity.reduce((s, m) => s + m.tasksCompleted, 0);
  const totalReworked  = activity.reduce((s, m) => s + m.reworked, 0);
  const billableHours  = activity.reduce((s, m) => s + m.billableHours, 0);
  const nonBillable    = activity.reduce((s, m) => s + m.nonBillableHours, 0);

  const completionPct = totalAssigned === 0 ? 0 : Math.round((totalCompleted / totalAssigned) * 100);
  const reworkRatio   = totalCompleted === 0 ? 0 : Math.round((totalReworked / totalCompleted) * 100);
  const risk          = riskLevel(completionPct, reworkRatio);

  return (
    <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Project Risk Score</h3>
          <p className="text-xs text-gray-400 mt-0.5">Aggregated health for the selected project and month</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${risk.bg} ${risk.color}`}>
          <span className={`w-2 h-2 rounded-full ${risk.dot}`} />
          {risk.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-1">
        <Metric label="Members"       value={activity.length} />
        <Metric label="Work Items Assigned" value={totalAssigned} />
        <Metric
          label="Completion"
          value={`${completionPct}%`}
          sub={`${totalCompleted} / ${totalAssigned}`}
          valueColor={completionPct >= 75 ? 'text-emerald-600' : completionPct >= 40 ? 'text-amber-600' : 'text-red-600'}
        />
        <Metric
          label="Rework Ratio"
          value={`${reworkRatio}%`}
          sub={`${totalReworked} items`}
          valueColor={reworkRatio > 30 ? 'text-red-600' : reworkRatio > 15 ? 'text-amber-600' : 'text-emerald-600'}
        />
        <Metric
          label="Billable Hrs"
          value={`${billableHours.toFixed(1)}h`}
          valueColor="text-emerald-700"
        />
        <Metric
          label="Non-Billable Hrs"
          value={`${nonBillable.toFixed(1)}h`}
          valueColor="text-gray-600"
        />
      </div>
    </div>
  );
}

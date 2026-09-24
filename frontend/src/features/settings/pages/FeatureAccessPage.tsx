import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../../api/settings.api';

type Feature = 'KPI' | 'REPORTS';
type Role = 'BU_HEAD' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE';

const FEATURES: { key: Feature; label: string; description: string }[] = [
  {
    key: 'KPI',
    label: 'KPI',
    description: 'Performance indicators and appraisal scores for team members',
  },
  {
    key: 'REPORTS',
    label: 'Reports',
    description: 'Sprint, project, and member-level reports and analytics',
  },
];

const ROLES: { key: Role; label: string; sublabel: string }[] = [
  { key: 'BU_HEAD',          label: 'BU Head',          sublabel: 'Data related to their BU' },
  { key: 'PROJECT_MANAGER',  label: 'Project Manager',  sublabel: 'Data related to their assigned projects / team members' },
  { key: 'TEAM_LEAD',        label: 'Team Lead',        sublabel: 'Data related to their assigned projects / team members' },
  { key: 'EMPLOYEE',         label: 'Other Users',      sublabel: 'Developer, QA, Designer, DevOps' },
];

function Toggle({ checked, locked, onChange }: { checked: boolean; locked?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => !locked && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        locked
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer'
      } ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
      aria-checked={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function FeatureAccessPage() {
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['feature-visibility'],
    queryFn: settingsApi.getFeatureVisibility,
  });

  const mutation = useMutation({
    mutationFn: ({ feature, role, visible }: { feature: string; role: string; visible: boolean }) =>
      settingsApi.updateFeatureVisibility(feature, role, visible),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-visibility'] }),
  });

  function getVisible(feature: Feature, role: Role): boolean {
    const entry = entries.find((e) => e.feature === feature && e.role === role);
    return entry?.visible ?? false;
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title card */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900">Feature Access Control</h2>
        <p className="text-sm text-gray-400 mt-1">
          Control which roles can see KPI and Reports sections in the navigation. Changes take effect immediately.
        </p>
      </div>

      {/* Table card — edge-to-edge so thead gets rounded top corners */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 px-5 text-xs font-medium w-64">Feature</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="text-center py-3 px-4 text-xs font-medium min-w-[130px]">
                    <div>{r.label}</div>
                    <div className="text-white/60 font-normal mt-0.5 text-[11px] leading-tight">{r.sublabel}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {FEATURES.map((f) => (
                <tr key={f.key} className="hover:bg-gray-50/50">
                  <td className="py-4 px-5">
                    <p className="font-medium text-gray-800">{f.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>
                  </td>
                  {ROLES.map((r) => (
                    <td key={r.key} className="py-4 px-4 text-center">
                      <div className="flex justify-center">
                        <Toggle
                          checked={getVisible(f.key, r.key)}
                          onChange={(visible) =>
                            mutation.mutate({ feature: f.key, role: r.key, visible })
                          }
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">
          Super User and Admin always have full access to all features. Changes here apply to BU Head, Project Managers, Team Leads, and other employees.
        </p>
      </div>
    </div>
  );
}

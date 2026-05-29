import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EmployeeKpiRecord } from '../../../types/kpi.types';
import { useAuthStore } from '../../../store/authStore';
import {
  GRADE_CONFIG,
  buildTeamSummary,
  computeGrade,
  computeCategoryScores,
} from '../data/kpiStaticData';
import { analyticsApi, type LiveEmployeeKpiRecord, type KpiRecord } from '../../../api/analyticsApi';
import { KPI_METRICS } from '../data/kpiStaticData';
import { KpiSummaryCards } from '../components/KpiSummaryCards';
import { KpiCategoryBarChart } from '../components/KpiCategoryBarChart';
import { KpiGradePieChart } from '../components/KpiGradePieChart';
import { KpiLeaderboard } from '../components/KpiLeaderboard';
import { KpiEmployeeDetailPanel } from '../components/KpiEmployeeDetailPanel';
import { KpiRadarChart } from '../components/KpiRadarChart';

const DEPT_FILTERS = ['All Departments', 'Digital', 'SalesForce', 'Mobile'];

const PERIOD_LABELS: Record<string, string> = {
  '2026-05': 'May 2026',
  '2026-04': 'April 2026',
  '2026-03': 'March 2026',
  '2026-02': 'February 2026',
  '2026-01': 'January 2026',
};

const AVAILABLE_PERIODS = Object.keys(PERIOD_LABELS);

const MANUAL_METRICS = [
  { id: 'engineering_hygiene', label: 'Engineering Hygiene', max: 5 },
  { id: 'reporting_documentation', label: 'Reporting & Docs', max: 5 },
  { id: 'positive_behaviour', label: 'Positive Behaviour', max: 5 },
];

function liveToRecord(live: LiveEmployeeKpiRecord): EmployeeKpiRecord {
  const metrics = live.metrics.map((m) => ({ metricId: m.metricId, points: m.points }));
  const categoryScores = computeCategoryScores(metrics);
  return {
    ...live,
    metrics,
    categoryScores,
    grade: computeGrade(live.totalScore),
  };
}

// ─── KPI Score Entry Panel ────────────────────────────────────────────────────

function KpiScoreEntryPanel({
  employees,
  period,
  existingRecords,
  onClose,
}: {
  employees: EmployeeKpiRecord[];
  period: string;
  existingRecords: KpiRecord[];
  onClose: () => void;
}) {
  const qc = useQueryClient();

  // Build initial scores from existing records
  const initialScores = () => {
    const map: Record<string, Record<string, number>> = {};
    for (const emp of employees) {
      map[emp.userId] = {};
      for (const m of MANUAL_METRICS) {
        const existing = existingRecords.find(
          (r) => r.userId === emp.userId && r.metricId === m.id,
        );
        map[emp.userId][m.id] = existing?.points ?? 5;
      }
    }
    return map;
  };

  const [scores, setScores] = useState<Record<string, Record<string, number>>>(initialScores);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<KpiRecord>[] = [];
      for (const emp of employees) {
        for (const m of MANUAL_METRICS) {
          promises.push(
            analyticsApi.upsertKpiRecord({
              userId: emp.userId,
              period,
              metricId: m.id,
              points: scores[emp.userId]?.[m.id] ?? 5,
            }),
          );
        }
      }
      return Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpi', period] });
      qc.invalidateQueries({ queryKey: ['kpi-records', period] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Enter Monthly KPI Scores</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              3 manual metrics · {PERIOD_LABELS[period] ?? period} · {employees.length} employees
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">
                  Employee
                </th>
                {MANUAL_METRICS.map((m) => (
                  <th key={m.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {m.label}
                    <span className="block font-normal normal-case text-[10px] text-gray-400">/5 pts</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => (
                <tr key={emp.userId} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="text-xs font-medium text-gray-800">{emp.name}</p>
                    <p className="text-[10px] text-gray-400">{emp.role}</p>
                  </td>
                  {MANUAL_METRICS.map((m) => (
                    <td key={m.id} className="px-4 py-3 text-center">
                      <select
                        value={scores[emp.userId]?.[m.id] ?? 5}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [emp.userId]: {
                              ...prev[emp.userId],
                              [m.id]: Number(e.target.value),
                            },
                          }))
                        }
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-16"
                      >
                        <option value={5}>5</option>
                        <option value={3}>3</option>
                        <option value={0}>0</option>
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-5 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save All Scores'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main KpiPage ─────────────────────────────────────────────────────────────

export function KpiPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const isAdminOrSuper = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const [selectedPeriod, setSelectedPeriod] = useState('2026-05');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showScoreEntry, setShowScoreEntry] = useState(false);

  const { data: liveData = [], isLoading } = useQuery({
    queryKey: ['kpi', selectedPeriod],
    queryFn: () => analyticsApi.getKpi(selectedPeriod),
  });

  const { data: kpiRecords = [] } = useQuery({
    queryKey: ['kpi-records', selectedPeriod],
    queryFn: () => analyticsApi.getKpiRecords(undefined, selectedPeriod),
    enabled: isAdminOrSuper,
  });

  const employees = useMemo(
    () => liveData.map(liveToRecord),
    [liveData],
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesDept = deptFilter === 'All Departments' || emp.department === deptFilter;
      const matchesSearch =
        searchQuery === '' ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [employees, deptFilter, searchQuery]);

  const summary = useMemo(
    () => (filteredEmployees.length > 0 ? buildTeamSummary(filteredEmployees, selectedPeriod) : null),
    [filteredEmployees, selectedPeriod],
  );

  function toggleRow(userId: string) {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  }

  // Employee view — show own KPI
  if (!isAdminOrSuper) {
    const ownRecord = employees.find((e) => e.userId === user?.id);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          Loading KPI data…
        </div>
      );
    }

    if (!ownRecord) {
      return (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          No KPI data found for this period.
        </div>
      );
    }

    const grade = GRADE_CONFIG[ownRecord.grade];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My KPI Appraisal</h1>
            <p className="text-sm text-gray-400 mt-0.5">Period: {PERIOD_LABELS[selectedPeriod]}</p>
          </div>
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${grade.bg} ${grade.text}`}>
            Grade {ownRecord.grade} — {ownRecord.totalScore} / 100
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <KpiRadarChart employee={ownRecord} />
        </div>
        <KpiEmployeeDetailPanel employee={ownRecord} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">KPI Appraisal</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Digital Appraisal System · {PERIOD_LABELS[selectedPeriod]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScoreEntry(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Enter Monthly Scores
          </button>
          <label className="text-xs text-gray-500 font-medium shrink-0">Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              qc.invalidateQueries({ queryKey: ['kpi', e.target.value] });
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {AVAILABLE_PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p] ?? p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          Loading KPI data…
        </div>
      ) : (
        <>
          {summary && (
            <>
              <KpiSummaryCards summary={summary} />

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2">
                  <KpiCategoryBarChart categoryAverages={summary.categoryAverages} />
                </div>
                <div className="xl:col-span-1">
                  <KpiGradePieChart summary={summary} />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-1">
                  <KpiLeaderboard employees={filteredEmployees} />
                </div>
                <div className="xl:col-span-2">
                  <ScoreGuideCard />
                </div>
              </div>
            </>
          )}

          {/* ── Employee KPI Table ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Employee KPI Records</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} · click a row to view full breakdown
                </p>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <div className="relative">
                  <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                  />
                </div>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DEPT_FILTERS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Employee</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden md:table-cell">
                      D &amp; E<span className="block font-normal normal-case text-[10px] text-gray-400">/50</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden md:table-cell">
                      Q &amp; E<span className="block font-normal normal-case text-[10px] text-gray-400">/20</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                      O &amp; C<span className="block font-normal normal-case text-[10px] text-gray-400">/10</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                      G &amp; I<span className="block font-normal normal-case text-[10px] text-gray-400">/10</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                      B &amp; R<span className="block font-normal normal-case text-[10px] text-gray-400">/10</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">
                      Total<span className="block font-normal normal-case text-[10px] text-gray-400">/100</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">Grade</th>
                    <th className="w-8 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-sm text-gray-400">
                        No employees match the current filters.
                      </td>
                    </tr>
                  )}
                  {[...filteredEmployees]
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((emp) => (
                      <EmployeeRow
                        key={emp.userId}
                        employee={emp}
                        isExpanded={expandedUserId === emp.userId}
                        onToggle={() => toggleRow(emp.userId)}
                      />
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showScoreEntry && (
        <KpiScoreEntryPanel
          employees={filteredEmployees}
          period={selectedPeriod}
          existingRecords={kpiRecords}
          onClose={() => setShowScoreEntry(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RowProps {
  employee: EmployeeKpiRecord;
  isExpanded: boolean;
  onToggle: () => void;
}

function EmployeeRow({ employee, isExpanded, onToggle }: RowProps) {
  const grade = GRADE_CONFIG[employee.grade];

  const getCatScore = (catName: string) =>
    employee.categoryScores.find((c) => c.category === catName);

  const dne = getCatScore('Delivery & Execution');
  const qne = getCatScore('Quality & Engineering Excellence');
  const onc = getCatScore('Ownership & Collaboration');
  const gni = getCatScore('Growth & Innovation');
  const bnr = getCatScore('Behaviour & Reliability');

  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-gray-50 cursor-pointer transition-colors ${
          isExpanded ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'
        }`}
      >
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">{employee.name}</p>
              <p className="text-xs text-gray-400">{employee.role} · {employee.department}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3.5 text-center hidden md:table-cell">
          <ScoreCell score={dne?.earned ?? 0} max={50} pct={dne?.percentage ?? 0} />
        </td>
        <td className="px-3 py-3.5 text-center hidden md:table-cell">
          <ScoreCell score={qne?.earned ?? 0} max={20} pct={qne?.percentage ?? 0} />
        </td>
        <td className="px-3 py-3.5 text-center hidden lg:table-cell">
          <ScoreCell score={onc?.earned ?? 0} max={10} pct={onc?.percentage ?? 0} />
        </td>
        <td className="px-3 py-3.5 text-center hidden lg:table-cell">
          <ScoreCell score={gni?.earned ?? 0} max={10} pct={gni?.percentage ?? 0} />
        </td>
        <td className="px-3 py-3.5 text-center hidden lg:table-cell">
          <ScoreCell score={bnr?.earned ?? 0} max={10} pct={bnr?.percentage ?? 0} />
        </td>
        <td className="px-3 py-3.5 text-center">
          <p className="font-bold text-gray-900 text-base">{employee.totalScore}</p>
          <div className="w-12 mx-auto h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${employee.totalScore}%`, backgroundColor: grade.color }} />
          </div>
        </td>
        <td className="px-3 py-3.5 text-center">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${grade.bg} ${grade.text} border ${grade.border}`}>
            {employee.grade}
          </span>
        </td>
        <td className="px-3 py-3.5 text-center">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} className="p-0">
            <KpiEmployeeDetailPanel employee={employee} />
          </td>
        </tr>
      )}
    </>
  );
}

function ScoreCell({ score, max: _max, pct }: { score: number; max: number; pct: number }) {
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#3B82F6' : pct >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm font-semibold text-gray-800">{score}</span>
      <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ScoreGuideCard() {
  const categories = [
    { name: 'Delivery & Execution (D & E)',         max: 50, color: '#3B82F6', metrics: 'Sprint · Delivery · Estimation · Throughput' },
    { name: 'Quality & Engineering (Q & E)',         max: 20, color: '#10B981', metrics: 'Rework Ratio · Defect Leakage · Engineering Hygiene' },
    { name: 'Ownership & Collaboration (O & C)',     max: 10, color: '#8B5CF6', metrics: 'Dependency & Agile · Reporting & Docs' },
    { name: 'Growth & Innovation (G & I)',           max: 10, color: '#F59E0B', metrics: 'Learning Velocity · Automation & Innovation' },
    { name: 'Behaviour & Reliability (B & R)',       max: 10, color: '#EC4899', metrics: 'Attendance · Positive Behaviour' },
  ];

  const grades = [
    { grade: 'A', range: '90 – 100', label: 'Excellent', color: '#10B981', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { grade: 'B', range: '75 – 89',  label: 'Good',      color: '#3B82F6', bg: 'bg-blue-100',    text: 'text-blue-700'    },
    { grade: 'C', range: '60 – 74',  label: 'Average',   color: '#F59E0B', bg: 'bg-amber-100',   text: 'text-amber-700'   },
    { grade: 'D', range: '< 60',     label: 'Poor',      color: '#EF4444', bg: 'bg-red-100',     text: 'text-red-700'     },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Scoring Reference Guide</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Digital Appraisal System — {KPI_METRICS.length} metrics, 100 points total
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</p>
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: cat.color }} />
              <div>
                <p className="text-xs font-medium text-gray-700">{cat.name}</p>
                <p className="text-[10px] text-gray-400">{cat.metrics} · max {cat.max} pts</p>
              </div>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Grade Thresholds</p>
          <div className="space-y-2">
            {grades.map((g) => (
              <div key={g.grade} className="flex items-center gap-2.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${g.bg} ${g.text}`}>
                  {g.grade}
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-800">{g.label}</p>
                  <p className="text-[10px] text-gray-400">{g.range} points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

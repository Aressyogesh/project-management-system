import { useState, useMemo } from 'react';
import type { EmployeeKpiRecord } from '../../../types/kpi.types';
import { useAuthStore } from '../../../store/authStore';
import {
  STATIC_KPI_DATA,
  AVAILABLE_PERIODS,
  GRADE_CONFIG,
  buildTeamSummary,
} from '../data/kpiStaticData';
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

export function KpiPage() {
  const user = useAuthStore((s) => s.user);
  const isAdminOrSuper = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const [selectedPeriod, setSelectedPeriod] = useState('2026-05');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    return STATIC_KPI_DATA.filter((emp) => {
      const matchesDept = deptFilter === 'All Departments' || emp.department === deptFilter;
      const matchesSearch =
        searchQuery === '' ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [deptFilter, searchQuery]);

  const summary = useMemo(
    () => buildTeamSummary(filteredEmployees, selectedPeriod),
    [filteredEmployees, selectedPeriod],
  );

  function toggleRow(userId: string) {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  }

  // Employee view: show only own KPI
  if (!isAdminOrSuper) {
    const ownRecord = STATIC_KPI_DATA[0]; // Fallback — real impl uses user.id
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
          <p className="text-sm text-gray-400 mt-0.5">Digital Appraisal System · {PERIOD_LABELS[selectedPeriod]}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium shrink-0">Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
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

      {/* ── Summary Cards ── */}
      <KpiSummaryCards summary={summary} />

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <KpiCategoryBarChart categoryAverages={summary.categoryAverages} />
        </div>
        <div className="xl:col-span-1">
          <KpiGradePieChart summary={summary} />
        </div>
      </div>

      {/* ── Leaderboard + Category Legend ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-1">
          <KpiLeaderboard employees={filteredEmployees} />
        </div>
        <div className="xl:col-span-2">
          <ScoreGuideCard />
        </div>
      </div>

      {/* ── Employee KPI Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table header with filters */}
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">
                  Employee
                </th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden md:table-cell">
                  D &amp; E
                  <span className="block font-normal normal-case text-[10px] text-gray-400">/50</span>
                </th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden md:table-cell">
                  Q &amp; E
                  <span className="block font-normal normal-case text-[10px] text-gray-400">/20</span>
                </th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                  O &amp; C
                  <span className="block font-normal normal-case text-[10px] text-gray-400">/10</span>
                </th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                  G &amp; I
                  <span className="block font-normal normal-case text-[10px] text-gray-400">/10</span>
                </th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                  B &amp; R
                  <span className="block font-normal normal-case text-[10px] text-gray-400">/10</span>
                </th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">
                  Total
                  <span className="block font-normal normal-case text-[10px] text-gray-400">/100</span>
                </th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">
                  Grade
                </th>
                <th className="w-8 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-sm text-gray-400">
                    No employees match the current filters.
                  </td>
                </tr>
              )}
              {filteredEmployees
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
        {/* Employee info */}
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

        {/* Category scores */}
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

        {/* Total with mini progress bar */}
        <td className="px-3 py-3.5 text-center">
          <p className="font-bold text-gray-900 text-base">{employee.totalScore}</p>
          <div className="w-12 mx-auto h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${employee.totalScore}%`,
                backgroundColor: grade.color,
              }}
            />
          </div>
        </td>

        {/* Grade badge */}
        <td className="px-3 py-3.5 text-center">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${grade.bg} ${grade.text} border ${grade.border}`}
          >
            {employee.grade}
          </span>
        </td>

        {/* Expand chevron */}
        <td className="px-3 py-3.5 text-center">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>

      {/* Expanded detail panel */}
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

interface ScoreCellProps {
  score: number;
  max: number;
  pct: number;
}

function ScoreCell({ score, max: _max, pct }: ScoreCellProps) {
  const color =
    pct >= 80 ? '#10B981' : pct >= 60 ? '#3B82F6' : pct >= 40 ? '#F59E0B' : '#EF4444';
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
    { name: 'Delivery & Execution (D & E)',           max: 50, color: '#3B82F6', metrics: 'Sprint · Delivery · Estimation · Throughput' },
    { name: 'Quality & Engineering (Q & E)',           max: 20, color: '#10B981', metrics: 'Rework Ratio · Defect Leakage · Engineering Hygiene' },
    { name: 'Ownership & Collaboration (O & C)',       max: 10, color: '#8B5CF6', metrics: 'Dependency & Agile · Reporting & Docs' },
    { name: 'Growth & Innovation (G & I)',             max: 10, color: '#F59E0B', metrics: 'Learning Velocity · Automation & Innovation' },
    { name: 'Behaviour & Reliability (B & R)',         max: 10, color: '#EC4899', metrics: 'Attendance · Positive Behaviour' },
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
        <p className="text-xs text-gray-400 mt-0.5">Digital Appraisal System — 13 metrics, 100 points total</p>
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

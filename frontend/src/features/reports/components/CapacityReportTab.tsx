import { useState, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import * as XLSX from 'xlsx-js-style';
import { apiClient } from '../../../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CapacityDay {
  day: number;
  dayOfWeek: string;
  isHoliday: boolean;
  holidayName?: string;
  isWeeklyOff: boolean;
}

interface CapacityCell {
  day: number;
  status: 'holiday' | 'weekly_off' | 'planned_leave' | 'unplanned_leave' | 'occupied' | 'partial' | 'available';
  hours: number;
  workItemHours?: number;
  isHalfDay?: boolean;
  restOfDayStatus?: string;
  hasWorkItem?: boolean;
  holidayName?: string;
  dayOfWeek: string;
}

interface CapacityEmployee {
  userId: string;
  name: string;
  role: string;
  cells: CapacityCell[];
  summary: { workingDays: number; occupiedDays: number; leaveDays: number; availableDays: number };
}

interface CapacityReport {
  period: string;
  year: number;
  month: number;
  daysInMonth: number;
  days: CapacityDay[];
  employees: CapacityEmployee[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const MONTHS_LIST = [
  { v: 1,  l: 'Jan' }, { v: 2,  l: 'Feb' }, { v: 3,  l: 'Mar' },
  { v: 4,  l: 'Apr' }, { v: 5,  l: 'May' }, { v: 6,  l: 'Jun' },
  { v: 7,  l: 'Jul' }, { v: 8,  l: 'Aug' }, { v: 9,  l: 'Sep' },
  { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dec' },
];

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_ABBR: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const STATUS_STYLE: Record<string, { bg: string; title: string }> = {
  holiday:         { bg: 'bg-orange-200',  title: 'Public Holiday' },
  weekly_off:      { bg: 'bg-gray-100',    title: 'Weekly Off' },
  planned_leave:   { bg: 'bg-pink-300',    title: 'On Planned Leave' },
  unplanned_leave: { bg: 'bg-blue-400',    title: 'On Unplanned Leave' },
  occupied:        { bg: 'bg-red-600',     title: 'Fully Occupied (≥8h logged)' },
  partial:         { bg: 'bg-red-400',     title: 'Work Assigned / Partially Occupied' },
  available:       { bg: 'bg-green-200',   title: 'Available' },
};

const LEGEND = [
  { label: 'Public Holiday',               color: 'bg-orange-200' },
  { label: 'Weekly Off',                   color: 'bg-gray-100 border border-gray-200' },
  { label: 'Planned Leave',                color: 'bg-pink-300' },
  { label: 'Unplanned Leave',              color: 'bg-blue-400' },
  { label: 'Fully Occupied (≥8h logged)',  color: 'bg-red-600' },
  { label: 'Work Assigned / Partial',      color: 'bg-red-400' },
  { label: 'Available',                    color: 'bg-green-200' },
];

function buildYears() {
  const cur = new Date().getFullYear();
  const years: number[] = [];
  for (let y = cur; y >= 2024; y--) years.push(y);
  return years;
}

function toPeriod(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function utilisationColor(pct: number) {
  if (pct >= 80) return 'text-green-600 font-semibold';
  if (pct >= 50) return 'text-amber-600 font-semibold';
  return 'text-red-500 font-semibold';
}

function cellLabel(cell: CapacityCell): string {
  if (cell.status === 'holiday')          return cell.holidayName ?? 'Holiday';
  if (cell.status === 'weekly_off')       return 'Off';
  if (cell.status === 'planned_leave')    return cell.isHalfDay ? 'Half-PL' : 'PL';
  if (cell.status === 'unplanned_leave')  return cell.isHalfDay ? 'Half-UL' : 'UL';
  if (cell.status === 'occupied')         return `${cell.hours}h`;
  if (cell.status === 'partial')          return cell.hours > 0 ? `${cell.hours}h` : 'WI';
  return '';
}

// ── XLSX colours (ARGB hex, no #) ────────────────────────────────────────────
const XL_COLORS: Record<string, string> = {
  holiday:         'FED7AA',
  weekly_off:      'F3F4F6',
  planned_leave:   'FBCFE8',
  unplanned_leave: '93C5FD',
  occupied:        'EF4444',
  partial:         'FCA5A5',
  available:       'D1FAE5',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XlStyle = Record<string, any>;

function cell(v: string | number, t: 's' | 'n', s: XlStyle): XLSX.CellObject {
  return { v, t, s } as XLSX.CellObject;
}

function saveWorkbook(wb: XLSX.WorkBook, fileName: string) {
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSingleMonthXlsx(data: CapacityReport, year: number) {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  const monthName = MONTH_NAMES[data.month];
  const fixedCols = 2;  // Employee, Role
  const dayCols   = data.days.length;
  const totalCols = fixedCols + dayCols + 4; // +4 summary cols

  // ── Row 0: Title ──
  ws['A1'] = cell(`Capacity Report — ${monthName} ${year}`, 's',
    { font: { bold: true, sz: 14, color: { rgb: '1E293B' } }, alignment: { horizontal: 'left' } });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.min(totalCols - 1, 13) } }];

  // ── Row 1: Legend ──
  const legendItems: [string, string][] = [
    ['Occupied (≥8h)', 'EF4444'],
    ['Work Assigned',  'FCA5A5'],
    ['Planned Leave',  'FBCFE8'],
    ['Unplanned Leave','93C5FD'],
    ['Holiday',        'FED7AA'],
    ['Available',      'D1FAE5'],
    ['Weekly Off',     'F3F4F6'],
  ];
  legendItems.forEach(([label, rgb], i) => {
    const col = i * 2;
    ws[XLSX.utils.encode_cell({ r: 1, c: col })] =
      cell('', 's', { fill: { patternType: 'solid', fgColor: { rgb } } });
    ws[XLSX.utils.encode_cell({ r: 1, c: col + 1 })] =
      cell(label, 's', { font: { sz: 9 }, alignment: { vertical: 'center' } });
  });

  // ── Row 2: blank spacer ──

  // ── Row 3: Column headers ──
  const hdrRow = 3;
  const hdrStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    fill: { patternType: 'solid' as const, fgColor: { rgb: '1E293B' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    border: {
      bottom: { style: 'thin' as const, color: { rgb: '334155' } },
      right:  { style: 'thin' as const, color: { rgb: '334155' } },
    },
  };

  ws[XLSX.utils.encode_cell({ r: hdrRow, c: 0 })] = cell('Employee', 's', hdrStyle);
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: 1 })] = cell('Role',     's', hdrStyle);

  data.days.forEach((d, i) => {
    const isOff = d.isWeeklyOff || d.isHoliday;
    ws[XLSX.utils.encode_cell({ r: hdrRow, c: fixedCols + i })] = cell(
      `${DAY_ABBR[d.dayOfWeek]?.[0] ?? ''}\n${d.day}`, 's',
      { ...hdrStyle, fill: { patternType: 'solid', fgColor: { rgb: isOff ? '475569' : '1E293B' } } },
    );
  });

  ['Occ Days', 'Leave Days', 'Avail Days', 'Util %'].forEach((h, i) => {
    ws[XLSX.utils.encode_cell({ r: hdrRow, c: fixedCols + dayCols + i })] = cell(h, 's', hdrStyle);
  });

  // ── Data rows ──
  data.employees.forEach((emp, empIdx) => {
    const row    = hdrRow + 1 + empIdx;
    const rowBg  = empIdx % 2 === 0 ? 'FAFAFA' : 'FFFFFF';

    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = cell(emp.name, 's',
      { font: { bold: true, sz: 10 }, fill: { patternType: 'solid', fgColor: { rgb: rowBg } }, alignment: { vertical: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = cell(emp.role.replace(/_/g, ' '), 's',
      { font: { sz: 9, color: { rgb: '64748B' } }, fill: { patternType: 'solid', fgColor: { rgb: rowBg } }, alignment: { vertical: 'center' } });

    emp.cells.forEach((dc, i) => {
      const lbl = cellLabel(dc);
      const rgb = XL_COLORS[dc.status] ?? 'FFFFFF';
      ws[XLSX.utils.encode_cell({ r: row, c: fixedCols + i })] = cell(lbl, 's', {
        fill: { patternType: 'solid', fgColor: { rgb } },
        font: { sz: 9, bold: dc.status === 'occupied', color: { rgb: dc.status === 'occupied' ? 'FFFFFF' : '1E293B' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { right: { style: 'hair', color: { rgb: 'E2E8F0' } } },
      });
    });

    const util    = emp.summary.workingDays > 0 ? Math.round((emp.summary.occupiedDays / emp.summary.workingDays) * 100) : 0;
    const utilRgb = util >= 80 ? 'D1FAE5' : util >= 50 ? 'FEF3C7' : 'FEE2E2';
    const summaryEntries: [string | number, 's' | 'n', string][] = [
      [emp.summary.occupiedDays,  'n', rowBg],
      [emp.summary.leaveDays,     'n', rowBg],
      [emp.summary.availableDays, 'n', rowBg],
      [`${util}%`,                's', utilRgb],
    ];
    summaryEntries.forEach(([v, t, bg], i) => {
      ws[XLSX.utils.encode_cell({ r: row, c: fixedCols + dayCols + i })] = cell(v, t, {
        font: { bold: true, sz: 10 },
        fill: { patternType: 'solid', fgColor: { rgb: bg } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { left: { style: 'thin', color: { rgb: 'E2E8F0' } } },
      });
    });
  });

  // Column widths
  ws['!cols'] = [
    { wch: 22 }, { wch: 18 },
    ...data.days.map(() => ({ wch: 4.5 })),
    { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 9 },
  ];
  ws['!rows'] = [{ hpt: 20 }, { hpt: 16 }, { hpt: 6 }, { hpt: 28 }];
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: hdrRow + data.employees.length, c: totalCols - 1 } });
  ws['!freeze'] = { xSplit: 2, ySplit: hdrRow + 1 };

  XLSX.utils.book_append_sheet(wb, ws, monthName);
  saveWorkbook(wb, `Capacity_${monthName}_${year}.xlsx`);
}

function exportConsolidatedXlsx(
  consolidated: Array<{
    name: string; role: string;
    monthData: Map<number, { occupiedDays: number; workingDays: number; leaveDays: number; utilisation: number }>;
    totalWorking: number; totalOccupied: number; totalLeave: number; totalUtil: number;
  }>,
  sortedMonths: number[],
  year: number,
) {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  const hdrStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    fill: { patternType: 'solid' as const, fgColor: { rgb: '1E293B' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    border: { bottom: { style: 'thin' as const, color: { rgb: '334155' } } },
  };

  // Title
  ws['A1'] = cell(`Capacity Report — Consolidated ${year}`, 's',
    { font: { bold: true, sz: 14 } });

  // Headers
  const hdrRow = 2;
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: 0 })] = cell('Employee', 's', hdrStyle);
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: 1 })] = cell('Role',     's', hdrStyle);

  let col = 2;
  sortedMonths.forEach((m) => {
    const ml = MONTHS_LIST.find((x) => x.v === m)?.l ?? '';
    ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = cell(`${ml}\nOcc Days`, 's', hdrStyle);
    ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = cell(`${ml}\nWorking`,  's', hdrStyle);
    ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = cell(`${ml}\nUtil%`,    's', hdrStyle);
  });
  const darkHdr = { ...hdrStyle, fill: { patternType: 'solid', fgColor: { rgb: '334155' } } };
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = cell('Total\nOcc',  's', darkHdr);
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = cell('Leave\nDays', 's', darkHdr);
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = cell('Total\nUtil%','s', darkHdr);
  const totalCols = col;

  consolidated.forEach((emp, empIdx) => {
    const row   = hdrRow + 1 + empIdx;
    const rowBg = empIdx % 2 === 0 ? 'FAFAFA' : 'FFFFFF';

    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = cell(emp.name, 's',
      { font: { bold: true, sz: 10 }, fill: { patternType: 'solid', fgColor: { rgb: rowBg } } });
    ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = cell(emp.role.replace(/_/g, ' '), 's',
      { font: { sz: 9, color: { rgb: '64748B' } }, fill: { patternType: 'solid', fgColor: { rgb: rowBg } } });

    let c = 2;
    sortedMonths.forEach((m) => {
      const ms = emp.monthData.get(m);
      const utilRgb = !ms ? 'F8FAFC' : ms.utilisation >= 80 ? 'D1FAE5' : ms.utilisation >= 50 ? 'FEF3C7' : 'FEE2E2';
      const ctr = { alignment: { horizontal: 'center' } };
      ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = cell(ms?.occupiedDays ?? '-', ms ? 'n' : 's', { ...ctr, fill: { patternType: 'solid', fgColor: { rgb: rowBg } } });
      ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = cell(ms?.workingDays  ?? '-', ms ? 'n' : 's', { ...ctr, fill: { patternType: 'solid', fgColor: { rgb: rowBg } } });
      ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = cell(ms ? `${ms.utilisation}%` : '-', 's', { ...ctr, font: { bold: !!ms }, fill: { patternType: 'solid', fgColor: { rgb: utilRgb } } });
    });

    const totalUtilRgb = emp.totalUtil >= 80 ? 'D1FAE5' : emp.totalUtil >= 50 ? 'FEF3C7' : 'FEE2E2';
    const totBg = { fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } }, alignment: { horizontal: 'center' } };
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = cell(`${emp.totalOccupied}/${emp.totalWorking}d`, 's', { ...totBg, font: { bold: true } });
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = cell(emp.totalLeave, 'n', totBg);
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = cell(`${emp.totalUtil}%`, 's', { font: { bold: true }, alignment: { horizontal: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: totalUtilRgb } } });
  });

  ws['!cols'] = [
    { wch: 22 }, { wch: 18 },
    ...sortedMonths.flatMap(() => [{ wch: 9 }, { wch: 9 }, { wch: 8 }]),
    { wch: 12 }, { wch: 10 }, { wch: 9 },
  ];
  ws['!rows'] = [{ hpt: 20 }, { hpt: 6 }, { hpt: 30 }];
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: hdrRow + consolidated.length, c: totalCols - 1 } });
  ws['!freeze'] = { xSplit: 2, ySplit: hdrRow + 1 };

  XLSX.utils.book_append_sheet(wb, ws, `Consolidated ${year}`);
  saveWorkbook(wb, `Capacity_Consolidated_${year}.xlsx`);
}

interface TooltipState {
  employeeName: string;
  day: number;
  month: number;
  year: number;
  cell: CapacityCell;
  x: number;
  y: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CapacityReportTab({ project }: { project?: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<number[]>([today.getMonth() + 1]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const projectId = project && project !== 'all' ? project : undefined;
  const sortedMonths = [...selectedMonths].sort((a, b) => a - b);

  function toggleMonth(m: number) {
    setSelectedMonths((prev) =>
      prev.includes(m)
        ? prev.length > 1 ? prev.filter((x) => x !== m) : prev
        : [...prev, m],
    );
  }

  const results = useQueries({
    queries: sortedMonths.map((m) => ({
      queryKey: ['capacity-report', year, m, projectId],
      queryFn: () =>
        apiClient
          .get('/analytics/reports/capacity', {
            params: { period: toPeriod(year, m), ...(projectId ? { projectId } : {}) },
          })
          .then((r) => r.data as CapacityReport),
      staleTime: 0,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError   = results.some((r) => r.isError);
  const allData   = results.map((r) => r.data).filter(Boolean) as CapacityReport[];

  const isSingleMonth = sortedMonths.length === 1;
  const singleData    = isSingleMonth ? allData[0] : undefined;
  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === sortedMonths[0]
      ? today.getDate()
      : -1;

  // Consolidated data for multi-month view
  const consolidated = useMemo(() => {
    if (allData.length === 0) return [];
    const empMap = new Map<string, {
      name: string; role: string;
      monthData: Map<number, CapacityEmployee['summary'] & { utilisation: number }>;
    }>();
    for (const report of allData) {
      for (const emp of report.employees) {
        if (!empMap.has(emp.userId)) {
          empMap.set(emp.userId, { name: emp.name, role: emp.role, monthData: new Map() });
        }
        const util = emp.summary.workingDays > 0
          ? Math.round((emp.summary.occupiedDays / emp.summary.workingDays) * 100)
          : 0;
        empMap.get(emp.userId)!.monthData.set(report.month, { ...emp.summary, utilisation: util });
      }
    }
    return Array.from(empMap.entries())
      .map(([userId, d]) => {
        let totalWorking = 0, totalOccupied = 0, totalLeave = 0;
        for (const s of d.monthData.values()) {
          totalWorking  += s.workingDays;
          totalOccupied += s.occupiedDays;
          totalLeave    += s.leaveDays;
        }
        const totalUtil = totalWorking > 0
          ? Math.round((totalOccupied / totalWorking) * 100)
          : 0;
        return { userId, ...d, totalWorking, totalOccupied, totalLeave, totalUtil };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allData]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">

        {/* Header + Filters */}
        <div className="flex flex-wrap items-start gap-4 mb-4">
          <div className="shrink-0">
            <h3 className="text-sm font-semibold text-gray-800">Monthly Capacity Report</h3>
            <p className="text-xs text-gray-400 mt-0.5">Employee availability</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            {/* Year */}
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400"
            >
              {buildYears().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Month checkboxes */}
            <div className="flex flex-wrap gap-1">
              {MONTHS_LIST.map((m) => {
                const checked = selectedMonths.includes(m.v);
                return (
                  <label
                    key={m.v}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                      checked
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => toggleMonth(m.v)}
                    />
                    {m.l}
                  </label>
                );
              })}
            </div>

            {/* Export */}
            {!isLoading && !isError && allData.length > 0 && (
              <button
                onClick={() => {
                  if (isSingleMonth && singleData) {
                    exportSingleMonthXlsx(singleData, year);
                  } else {
                    exportConsolidatedXlsx(consolidated, sortedMonths, year);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export to Excel
              </button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded ${item.color}`} />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Loading / Error */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            Loading capacity data…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12 text-sm text-red-400">
            Failed to load capacity report.
          </div>
        ) : allData.length === 0 || (isSingleMonth && (!singleData || singleData.employees.length === 0)) ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            No employee data for this period.
          </div>
        ) : isSingleMonth && singleData ? (
          /* ── Single-month: day grid ── */
          <div className="overflow-x-auto">
            <table
              className="text-xs border-collapse"
              style={{ minWidth: `${180 + singleData.daysInMonth * 32}px` }}
            >
              <thead className="sticky top-0 z-30 bg-white">
                <tr>
                  <th className="sticky left-0 z-20 bg-white px-3 py-2 text-left font-semibold text-gray-700 w-44 min-w-[11rem] border-r border-gray-100">
                    Employee
                  </th>
                  {singleData.days.map((d) => (
                    <th
                      key={d.day}
                      className={`px-1 py-1.5 text-center font-medium w-7 border-l border-gray-50 ${
                        d.day === todayDay ? 'ring-1 ring-blue-400 ring-inset rounded' : ''
                      } ${
                        d.isWeeklyOff ? 'text-gray-300' : d.isHoliday ? 'text-orange-500' : 'text-gray-500'
                      }`}
                      title={d.holidayName ?? d.dayOfWeek}
                    >
                      <div>{DAY_ABBR[d.dayOfWeek]?.[0] ?? ''}</div>
                      <div className="font-bold">{d.day}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-l border-gray-100 whitespace-nowrap">
                    Summary
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-l border-gray-100 whitespace-nowrap">
                    Utilisation
                  </th>
                </tr>
              </thead>
              <tbody>
                {singleData.employees.map((emp) => {
                  const util = emp.summary.workingDays > 0
                    ? Math.round((emp.summary.occupiedDays / emp.summary.workingDays) * 100)
                    : 0;
                  return (
                    <tr key={emp.userId} className="hover:bg-gray-50/30">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-gray-100 border-t border-gray-50">
                        <p className="font-semibold text-gray-800 truncate max-w-[160px]">{emp.name}</p>
                        <p className="text-[10px] text-gray-400 truncate capitalize">
                          {emp.role.replace(/_/g, ' ').toLowerCase()}
                        </p>
                      </td>
                      {emp.cells.map((cell) => {
                        const style  = STATUS_STYLE[cell.status];
                        const isToday = cell.day === todayDay;
                        return (
                          <td
                            key={cell.day}
                            className="px-0.5 py-1 border-l border-gray-50 border-t border-gray-50 text-center cursor-default"
                            onMouseEnter={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setTooltip({ employeeName: emp.name, day: cell.day, month: singleData.month, year, cell, x: rect.left + rect.width / 2, y: rect.top });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {cell.isHalfDay ? (
                              <div
                                className={`w-6 h-6 rounded mx-auto overflow-hidden flex flex-col ${isToday ? 'ring-1 ring-blue-500' : ''}`}
                              >
                                <div className={`flex-1 ${style.bg}`} />
                                <div className={`flex-1 ${STATUS_STYLE[cell.restOfDayStatus ?? 'available'].bg}`} />
                              </div>
                            ) : (
                              <div
                                className={`w-6 h-6 rounded mx-auto ${style.bg} ${isToday ? 'ring-1 ring-blue-500' : ''} ${
                                  cell.status === 'occupied' || cell.status === 'partial' || cell.status === 'unplanned_leave' ? 'text-white' : ''
                                } flex items-center justify-center text-[9px] font-medium`}
                              >
                                {cell.hours > 0 && cell.status !== 'holiday' && cell.status !== 'weekly_off'
                                  ? `${cell.hours}h`
                                  : cell.hasWorkItem && cell.status === 'partial'
                                  ? '●'
                                  : ''}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 border-l border-gray-100 border-t border-gray-50 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-red-500 font-medium">{emp.summary.occupiedDays}d occ</span>
                          <span className="text-[10px] text-pink-500">{emp.summary.leaveDays}d leave</span>
                          <span className="text-[10px] text-green-600">{emp.summary.availableDays}d avail</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-l border-gray-100 border-t border-gray-50 text-center whitespace-nowrap">
                        <span className={`text-sm ${utilisationColor(util)}`}>{util}%</span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto mt-1">
                          <div
                            className={`h-1.5 rounded-full ${util >= 80 ? 'bg-green-500' : util >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(util, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Multi-month: consolidated summary ── */
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 min-w-[160px] border-r border-gray-100">
                    Employee
                  </th>
                  {sortedMonths.map((m) => (
                    <th key={m} className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-100 whitespace-nowrap min-w-[90px]">
                      {MONTHS_LIST.find((x) => x.v === m)?.l} {year}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-200 whitespace-nowrap bg-gray-100">
                    Total Occ
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-100 whitespace-nowrap bg-gray-100">
                    Leave Days
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-100 whitespace-nowrap bg-gray-100">
                    Utilisation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {consolidated.length === 0 ? (
                  <tr>
                    <td colSpan={sortedMonths.length + 4} className="text-center py-10 text-gray-400">
                      No data for selected period.
                    </td>
                  </tr>
                ) : consolidated.map((emp) => (
                  <tr key={emp.userId} className="hover:bg-gray-50/50">
                    <td className="sticky left-0 bg-white px-4 py-3 border-r border-gray-100">
                      <p className="font-semibold text-gray-800 truncate max-w-[150px]">{emp.name}</p>
                      <p className="text-[10px] text-gray-400 truncate capitalize">
                        {emp.role.replace(/_/g, ' ').toLowerCase()}
                      </p>
                    </td>
                    {sortedMonths.map((m) => {
                      const s = emp.monthData.get(m);
                      return (
                        <td key={m} className="px-4 py-3 text-center border-l border-gray-50">
                          {s ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-red-500 font-medium">{s.occupiedDays}d occ</span>
                              <span className="text-gray-400">{s.workingDays}d work</span>
                              <span className={`text-[10px] ${utilisationColor(s.utilisation)}`}>{s.utilisation}%</span>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-semibold text-gray-800 border-l border-gray-200 bg-gray-50/50">
                      {emp.totalOccupied}d / {emp.totalWorking}d
                    </td>
                    <td className="px-4 py-3 text-center text-pink-500 font-medium border-l border-gray-100 bg-gray-50/50">
                      {emp.totalLeave}d
                    </td>
                    <td className="px-4 py-3 text-center border-l border-gray-100 bg-gray-50/50">
                      <span className={`text-sm ${utilisationColor(emp.totalUtil)}`}>{emp.totalUtil}%</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto mt-1">
                        <div
                          className={`h-1.5 rounded-full ${emp.totalUtil >= 80 ? 'bg-green-500' : emp.totalUtil >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(emp.totalUtil, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[160px]"
          style={{ top: tooltip.y - 8, left: tooltip.x, transform: 'translate(-50%, -100%)' }}
        >
          <p className="font-semibold text-gray-800">{tooltip.employeeName}</p>
          <p className="text-gray-500">{MONTH_NAMES[tooltip.month]} {tooltip.day}, {tooltip.year}</p>
          <p className="text-gray-600 mt-1">
            Status: <span className="font-medium capitalize">
              {tooltip.cell.isHalfDay
                ? `Half-day — ${STATUS_STYLE[tooltip.cell.status].title}`
                : tooltip.cell.status === 'partial'
                  ? tooltip.cell.hours > 0 && tooltip.cell.hasWorkItem
                    ? `${tooltip.cell.hours}h Logged · Work Item Assigned`
                    : tooltip.cell.hours > 0
                    ? `${tooltip.cell.hours}h Logged (Partial Day)`
                    : 'Work Item Assigned (No Hours Logged Yet)'
                : STATUS_STYLE[tooltip.cell.status].title}
            </span>
          </p>
          {tooltip.cell.isHalfDay && tooltip.cell.restOfDayStatus && (
            <p className="text-gray-600">Rest of day: <span className="font-medium capitalize">{STATUS_STYLE[tooltip.cell.restOfDayStatus]?.title ?? tooltip.cell.restOfDayStatus}</span></p>
          )}
          {(tooltip.cell.workItemHours ?? 0) > 0 && (
            <p className="text-gray-600">Allocated (est): <span className="font-medium text-red-600">{tooltip.cell.workItemHours}h</span></p>
          )}
          {tooltip.cell.hours > 0 && (
            <>
              <p className="text-gray-600">Hours logged: <span className="font-medium">{tooltip.cell.hours}h</span></p>
              {(tooltip.cell.status === 'occupied' || tooltip.cell.status === 'partial') && (
                <p className="text-gray-600">Hours available: <span className="font-medium">{Math.max(0, 8 - tooltip.cell.hours)}h</span></p>
              )}
            </>
          )}
          {tooltip.cell.hours > 8 && (
            <p className="text-red-600 font-semibold text-[10px] mt-1">Overloaded — {tooltip.cell.hours - 8}h over capacity</p>
          )}
          {tooltip.cell.status === 'available' && (
            <p className="text-gray-600">Hours available: <span className="font-medium">8h</span></p>
          )}
          {tooltip.cell.hasWorkItem && !(tooltip.cell.workItemHours ?? 0) && (
            <p className="text-red-500 text-[10px] mt-0.5">Has assigned work item</p>
          )}
          {tooltip.cell.holidayName && (
            <p className="text-orange-600">{tooltip.cell.holidayName}</p>
          )}
        </div>
      )}
    </div>
  );
}

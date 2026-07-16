import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx-js-style';
import type { WorkItem } from '../types/board.types';

const PAGE_SIZE = 25;

interface Column {
  status: string;
  label: string;
  items: WorkItem[];
}

interface MemberOption { id: string; fullName: string; }

interface Props {
  columns: Column[];
  onCardClick: (item: WorkItem) => void;
  onDelete?: (itemId: string) => void;
  canReassign?: boolean;
  members?: MemberOption[];
  onAssigneeChange?: (itemId: string, assigneeId: string | null) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const TYPE_STYLES: Record<string, string> = {
  EPIC:       'bg-purple-100 text-purple-700',
  USER_STORY: 'bg-blue-100 text-blue-700',
  TASK:       'bg-green-100 text-green-700',
  SUB_TASK:   'bg-gray-100 text-gray-600',
  BUG:        'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  EPIC:       'Epic',
  USER_STORY: 'Story',
  TASK:       'Task',
  SUB_TASK:   'Sub-Task',
  BUG:        'Bug',
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-yellow-400',
  LOW:      'bg-gray-400',
};

const STATUS_STYLES: Record<string, string> = {
  TODO:         'bg-gray-100 text-gray-600',
  IN_PROGRESS:  'bg-blue-100 text-blue-700',
  BLOCKED:      'bg-red-100 text-red-700',
  IN_REVIEW:    'bg-amber-100 text-amber-700',
  READY_FOR_QA: 'bg-yellow-100 text-yellow-700',
  IN_QA:        'bg-violet-100 text-violet-700',
  QA_DONE:      'bg-teal-100 text-teal-700',
  CLOSED:       'bg-emerald-100 text-emerald-700',
};

type SortKey = 'id' | 'title' | 'assignee' | 'type' | 'bugClassification' | 'status' | 'priority' | 'startDate' | 'dueDate' | 'age' | 'estHrs' | 'loggedHrs';
type SortDir = 'asc' | 'desc';

const PRIORITY_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const STATUS_RANK: Record<string, number> = { TODO: 1, IN_PROGRESS: 2, BLOCKED: 3, IN_REVIEW: 4, READY_FOR_QA: 5, IN_QA: 6, QA_DONE: 7, CLOSED: 8 };
const TYPE_RANK: Record<string, number>    = { EPIC: 1, USER_STORY: 2, TASK: 3, SUB_TASK: 4, BUG: 5 };

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="inline-flex flex-col ml-1 shrink-0">
      <svg className={`w-2 h-2 ${active && dir === 'asc' ? 'text-primary-600' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l8 8H4z"/></svg>
      <svg className={`w-2 h-2 -mt-px ${active && dir === 'desc' ? 'text-primary-600' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 20l-8-8h16z"/></svg>
    </span>
  );
}

const BUG_CLASS_LABELS: Record<string, string> = {
  SECURITY:            'Security',
  CRASH_HANG:          'Crash/Hang',
  DATA_LOSS:           'Data Loss',
  PERFORMANCE:         'Performance',
  UI_USABILITY:        'UI/Usability',
  OTHER_BUG:           'Other Bug',
  OTHER:               'Other',
  FEATURE_NEW:         'Feature/New',
  ENHANCEMENT:         'Enhancement',
  DESIGN:              'Design',
  NEW_BUG:             'New Bug',
  CODE_REVIEW:         'Code Review',
  UNIT_TESTING:        'Unit Testing',
  SUGGESTION:          'Suggestion',
  PROJECT_MANAGEMENT:  'Project Mgmt',
  EXISTING_APPLICATION:'Existing App',
};

const STATUS_LABELS: Record<string, string> = {
  TODO:         'To Do',
  IN_PROGRESS:  'In Progress',
  BLOCKED:      'Blocked',
  IN_REVIEW:    'In Review',
  READY_FOR_QA: 'Ready for QA',
  IN_QA:        'In QA',
  QA_DONE:      'QA Done',
  CLOSED:       'Closed',
};

function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

type XS = Record<string, unknown>;
function xc(v: string | number, t: 's' | 'n', s: XS): XLSX.CellObject { return { v, t, s } as XLSX.CellObject; }

export function exportListToExcel(items: (WorkItem & { _columnLabel: string })[], today: Date) {
  const HDR: XS = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    fill: { patternType: 'solid', fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { bottom: { style: 'thin', color: { rgb: '2D5F8A' } } },
  };

  const HEADERS = ['#', 'ID', 'Title', 'Assignee', 'Type', 'Status', 'Priority', 'Start Date', 'Due Date', 'Age (days)', 'Est. Hrs', 'Logged Hrs'];
  const TERMINAL = new Set(['QA_DONE', 'CLOSED']);

  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  HEADERS.forEach((h, i) => { ws[XLSX.utils.encode_cell({ r: 0, c: i })] = xc(h, 's', HDR); });

  items.forEach((item, idx) => {
    const row = idx + 1;
    const bg = idx % 2 === 0 ? 'F1F5F9' : 'FFFFFF';
    const fill = (rgb: string): XS => ({ fill: { patternType: 'solid', fgColor: { rgb } } });

    const created = new Date(item.createdAt);
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const createdLocal = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const ageDays = Math.floor((todayLocal.getTime() - createdLocal.getTime()) / 86400000);

    const logged = item.timesheetEntries
      ? item.timesheetEntries.reduce((s, e) => s + Number(e.hours), 0)
      : 0;

    const fmtD = (iso?: string | null) =>
      iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

    const cells: { v: string | number; t: 's' | 'n'; extra?: XS }[] = [
      { v: idx + 1,                                                    t: 'n', extra: { alignment: { horizontal: 'center' }, font: { sz: 9, color: { rgb: '94A3B8' } } } },
      { v: item.displayId ?? item.id.slice(0, 8),                     t: 's', extra: { font: { sz: 9, color: { rgb: '64748B' } } } },
      { v: item.title,                                                  t: 's', extra: { font: { bold: true, sz: 10 } } },
      { v: item.assignee?.fullName ?? 'Unassigned',                    t: 's' },
      { v: TYPE_LABELS[item.type] ?? item.type,                        t: 's', extra: { alignment: { horizontal: 'center' } } },
      { v: STATUS_LABELS[item.status] ?? item.status,                  t: 's', extra: { alignment: { horizontal: 'center' } } },
      { v: item.priority.charAt(0) + item.priority.slice(1).toLowerCase(), t: 's', extra: { alignment: { horizontal: 'center' } } },
      { v: fmtD(item.startDate),                                       t: 's', extra: { alignment: { horizontal: 'center' } } },
      { v: fmtD(item.dueDate),                                         t: 's', extra: { alignment: { horizontal: 'center' } } },
      { v: TERMINAL.has(item.status) ? '' : String(ageDays),          t: 's', extra: { alignment: { horizontal: 'center' } } },
      { v: item.estimatedHours != null ? `${item.estimatedHours}h` : '', t: 's', extra: { alignment: { horizontal: 'center' } } },
      { v: logged > 0 ? `${logged}h` : '',                             t: 's', extra: { alignment: { horizontal: 'center' } } },
    ];

    cells.forEach(({ v, t, extra }, i) => {
      ws[XLSX.utils.encode_cell({ r: row, c: i })] = xc(v, t, { ...fill(bg), font: { sz: 10 }, ...extra });
    });
  });

  ws['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 40 }, { wch: 22 },
    { wch: 12 }, { wch: 16 }, { wch: 10 },
    { wch: 14 }, { wch: 14 }, { wch: 11 }, { wch: 10 }, { wch: 12 },
  ];
  ws['!rows'] = [{ hpt: 26 }];
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: items.length, c: HEADERS.length - 1 } });
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, 'Work Items');
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `WorkItems_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ListView({ columns, onCardClick, onDelete, canReassign, members = [], onAssigneeChange }: Props) {
  const [reassignOpenId, setReassignOpenId] = useState<string | null>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const dropRef = useRef<HTMLDivElement>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  useEffect(() => {
    if (!reassignOpenId) return;
    function handleOutside(e: MouseEvent) {
      if (!dropRef.current?.contains(e.target as Node)) setReassignOpenId(null);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [reassignOpenId]);

  function openReassign(e: React.MouseEvent, itemId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropPos({ top: rect.bottom + 4, left: rect.left });
    setReassignOpenId((id) => (id === itemId ? null : itemId));
  }

  function selectAssignee(e: React.MouseEvent, itemId: string, assigneeId: string | null) {
    e.stopPropagation();
    setReassignOpenId(null);
    onAssigneeChange?.(itemId, assigneeId);
  }
  const allItems = useMemo(
    () => columns.flatMap((col) => col.items.map((item) => ({ ...item, _columnLabel: col.label }))),
    [columns],
  );

  const dir = sortDir === 'asc' ? 1 : -1;
  const nullLast = (a: number | null, b: number | null) =>
    a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : dir * (a - b);
  const sortedItems = !sortKey ? allItems : [...allItems].sort((a, b) => {
    switch (sortKey) {
      case 'id':       return dir * (a.displayId ?? a.id).localeCompare(b.displayId ?? b.id);
      case 'title':    return dir * a.title.localeCompare(b.title);
      case 'assignee': {
        const an = a.assignee?.fullName ?? '', bn = b.assignee?.fullName ?? '';
        if (!an && bn) return 1; if (an && !bn) return -1;
        return dir * an.localeCompare(bn);
      }
      case 'type':     return dir * ((TYPE_RANK[a.type] ?? 99) - (TYPE_RANK[b.type] ?? 99));
      case 'status':   return dir * ((STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99));
      case 'priority': return dir * ((PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99));
      case 'startDate': return nullLast(a.startDate ? new Date(a.startDate).getTime() : null, b.startDate ? new Date(b.startDate).getTime() : null);
      case 'dueDate':   return nullLast(a.dueDate ? new Date(a.dueDate).getTime() : null, b.dueDate ? new Date(b.dueDate).getTime() : null);
      case 'age':       return dir * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'estHrs':    return nullLast(a.estimatedHours ?? null, b.estimatedHours ?? null);
      case 'bugClassification': {
        const av = a.bugClassification ?? null;
        const bv = b.bugClassification ?? null;
        if (!av && bv) return 1; if (av && !bv) return -1; if (!av && !bv) return 0;
        const ac = BUG_CLASS_LABELS[av!] ?? av!;
        const bc = BUG_CLASS_LABELS[bv!] ?? bv!;
        return dir * ac.localeCompare(bc);
      }
      case 'loggedHrs': {
        const al = a.timesheetEntries?.reduce((s, e) => s + Number(e.hours), 0) ?? 0;
        const bl = b.timesheetEntries?.reduce((s, e) => s + Number(e.hours), 0) ?? 0;
        return dir * (al - bl);
      }
      default: return 0;
    }
  });

  const showBugColumns = allItems.length > 0 && allItems.every((i) => i.type === 'BUG');

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = sortedItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [allItems.length]);

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-[#cccccc] shadow-sm gap-2">
        <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm text-gray-400">No work items match the current filters.</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
    <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {([
                { key: 'id',                label: 'ID',             cls: 'w-20 text-left' },
                { key: 'title',             label: 'Title',          cls: 'text-left' },
                { key: 'assignee',          label: 'Assignee',       cls: 'w-32 text-left' },
                { key: 'type',              label: 'Type',           cls: 'w-24 text-left' },
                ...(showBugColumns ? [{ key: 'bugClassification' as SortKey, label: 'Classification', cls: 'w-32 text-left' }] : []),
                { key: 'status',            label: 'Status',         cls: 'w-32 text-left' },
                { key: 'priority',          label: 'Priority',       cls: 'w-24 text-left' },
                { key: 'startDate',         label: 'Start Date',     cls: 'w-28 text-left' },
                { key: 'dueDate',           label: 'Due Date',       cls: 'w-28 text-left' },
                { key: 'age',               label: 'Age',            cls: 'w-16 text-center' },
                { key: 'estHrs',            label: 'Est. Hrs',       cls: 'w-20 text-center' },
                { key: 'loggedHrs',         label: 'Logged Hrs',     cls: 'w-24 text-center' },
              ] as { key: SortKey; label: string; cls: string }[]).map(({ key, label, cls }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none ${cls}`}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {label}
                    <SortIcon active={sortKey === key} dir={sortDir} />
                  </span>
                </th>
              ))}
              {onDelete && <th className="w-10 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const isOverdue =
                item.dueDate &&
                new Date(item.dueDate.slice(0, 10) + 'T00:00:00') < today &&
                item.status !== 'QA_DONE' &&
                item.status !== 'CLOSED';

              return (
                <tr
                  key={item.id}
                  onClick={() => onCardClick(item)}
                  className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                >
                  {/* ID */}
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                    {item.displayId ?? item.id.slice(0, 8)}
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3 max-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                    {item.parent && (
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">↳ {item.parent.title}</p>
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {canReassign ? (
                      <button
                        onClick={(e) => openReassign(e, item.id)}
                        title={item.assignee ? `${item.assignee.fullName} — click to reassign` : 'Unassigned — click to assign'}
                        className="flex items-center gap-1.5 hover:opacity-80 transition"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center shrink-0 ring-2 ring-transparent hover:ring-primary-300 transition">
                          <span className="text-white text-[9px] font-semibold">
                            {item.assignee ? getInitials(item.assignee.fullName) : '?'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-700 truncate max-w-[80px]">
                          {item.assignee ? item.assignee.fullName.split(' ')[0] : <span className="text-gray-300">Unassigned</span>}
                        </span>
                      </button>
                    ) : item.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                          <span className="text-white text-[9px] font-semibold">{getInitials(item.assignee.fullName)}</span>
                        </div>
                        <span className="text-xs text-gray-700 truncate max-w-[90px]">{item.assignee.fullName.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_STYLES[item.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                  </td>

                  {/* Bug Classification */}
                  {showBugColumns && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.bugClassification ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
                          {BUG_CLASS_LABELS[item.bugClassification] ?? item.bugClassification}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  )}

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {item._columnLabel}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[item.priority] ?? 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-600">
                        {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </td>

                  {/* Start Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.startDate
                      ? <span className="text-xs text-gray-600">{fmtDate(item.startDate)}</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.dueDate ? (
                      <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {fmtDate(item.dueDate)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Age */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {item.status !== 'QA_DONE' && item.status !== 'CLOSED' ? (() => {
                      const created = new Date(item.createdAt);
                      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const createdLocal = new Date(created.getFullYear(), created.getMonth(), created.getDate());
                      const ageDays = Math.floor((todayLocal.getTime() - createdLocal.getTime()) / 86400000);
                      const cls = ageDays >= 14 ? 'text-red-500 font-semibold' : ageDays >= 7 ? 'text-amber-500 font-medium' : 'text-gray-500';
                      return <span className={`text-xs ${cls}`}>{ageDays}d</span>;
                    })() : <span className="text-xs text-gray-300">—</span>}
                  </td>

                  {/* Estimated Hours */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="text-xs text-gray-600">
                      {item.estimatedHours != null ? `${item.estimatedHours}h` : '—'}
                    </span>
                  </td>

                  {/* Logged Hours */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {(() => {
                      const logged = item.timesheetEntries
                        ? item.timesheetEntries.reduce((s, e) => s + Number(e.hours), 0)
                        : 0;
                      return logged > 0
                        ? <span className="text-xs text-emerald-600 font-medium">{logged}h</span>
                        : <span className="text-xs text-gray-300">—</span>;
                    })()}
                  </td>


                  {/* Delete */}
                  {onDelete && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDelete(item.id)}
                        title="Delete"
                        className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-50 bg-gray-50/40">
        <p className="text-[10px] text-gray-400">
          Showing{' '}
          <span className="font-medium text-gray-600">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedItems.length)}
          </span>{' '}
          of <span className="font-medium text-gray-600">{sortedItems.length}</span> item{sortedItems.length !== 1 ? 's' : ''}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition ${
                      safePage === p
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Reassign dropdown portal */}
    {reassignOpenId && createPortal(
      <div
        ref={dropRef}
        style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
        className="bg-white rounded-xl shadow-xl border border-[#cccccc] py-1 min-w-[190px] max-h-72 overflow-y-auto"
      >
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 py-1.5 border-b border-gray-100">
          Assign to
        </p>
        {items.find((i) => i.id === reassignOpenId)?.assignee && (
          <button
            onClick={(e) => selectAssignee(e, reassignOpenId, null)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition"
          >
            <span className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400 shrink-0">—</span>
            Unassign
          </button>
        )}
        {members.map((m) => {
          const currentAssignee = items.find((i) => i.id === reassignOpenId)?.assignee;
          return (
            <button
              key={m.id}
              onClick={(e) => selectAssignee(e, reassignOpenId, m.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-xs hover:bg-gray-50 transition ${
                currentAssignee?.id === m.id ? 'font-semibold text-primary-700' : 'text-gray-700'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                {getInitials(m.fullName)}
              </span>
              <span className="flex-1 text-left">{m.fullName}</span>
              {currentAssignee?.id === m.id && (
                <svg className="w-3 h-3 shrink-0 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>,
      document.body,
    )}
    </>
  );
}

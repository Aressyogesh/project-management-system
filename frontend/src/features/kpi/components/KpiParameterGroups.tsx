import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { KpiMetricScore } from '../../../types/kpi.types';
import type { KpiCoreValueGroup, KpiSubCategoryGroup } from '../data/kpiStaticData';
import { KPI_CORE_VALUE_GROUPS, computeGrade, GRADE_CONFIG } from '../data/kpiStaticData';
import { analyticsApi, type KpiNote } from '../../../api/analyticsApi';

const BADGE_STYLES = {
  AUTO:   { label: 'AUTO',   cls: 'bg-green-100 text-green-700 border border-green-300' },
  MANUAL: { label: 'MANUAL', cls: 'bg-amber-100 text-amber-700 border border-amber-300' },
  SELF:   { label: 'SELF',   cls: 'bg-blue-100  text-blue-700  border border-blue-300'  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Notes sub-component ───────────────────────────────────────────────────────

interface NotesProps {
  metricId: string;
  userId: string;
  period: string;
  canAddNotes: boolean;
  notes: KpiNote[];
  onAdd: (content: string) => void;
  onDelete: (noteId: string) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  isAdding: boolean;
}

function MetricNotes({ metricId, notes, canAddNotes, onAdd, onDelete, currentUserId, isAdmin, isAdding }: NotesProps) {
  const [text, setText] = useState('');
  const metricNotes = notes.filter((n) => n.metricId === metricId);

  return (
    <div className="mt-2 mb-3 ml-1 mr-7 rounded-lg border border-amber-100 overflow-hidden bg-amber-50">
      <div className="px-3 py-1.5 border-b border-amber-100 bg-amber-100 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
          PM Notes {metricNotes.length > 0 && `(${metricNotes.length})`}
        </p>
      </div>

      <div className="px-3 py-2 space-y-2">
        {metricNotes.length === 0 && !canAddNotes && (
          <p className="text-[11px] text-gray-400 italic">No notes added yet.</p>
        )}

        {metricNotes.map((note) => (
          <div key={note.id} className="bg-white rounded border border-amber-100 px-3 py-2 relative group">
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-gray-400">
                {note.author.fullName} · {formatTime(note.createdAt)}
              </p>
              {(isAdmin || note.author.id === currentUserId) && (
                <button
                  onClick={() => onDelete(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 transition-all"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}

        {canAddNotes && (
          <div className="flex gap-2 pt-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a note for this metric…"
              rows={2}
              className="flex-1 text-xs border border-amber-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:border-amber-400 bg-white"
            />
            <button
              onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }}
              disabled={!text.trim() || isAdding}
              className="self-end px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────────

interface MetricRowProps {
  metricId: string;
  name: string;
  subTitle: string;
  badge: 'AUTO' | 'MANUAL' | 'SELF';
  maxPoints: number;
  weightage: number;
  scoringDescription: string;
  formula: string;
  example: string;
  score: number | null;
  barColor: string;
  textColor: string;
  // notes
  userId?: string;
  period?: string;
  canAddNotes: boolean;
  notes: KpiNote[];
  onAddNote: (metricId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  isAdding: boolean;
}

function MetricRow({
  metricId,
  name,
  subTitle,
  badge,
  maxPoints,
  weightage,
  scoringDescription,
  formula,
  example,
  score,
  barColor,
  textColor,
  userId,
  period,
  canAddNotes,
  notes,
  onAddNote,
  onDeleteNote,
  currentUserId,
  isAdmin,
  isAdding,
}: MetricRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const pct = score !== null ? Math.min(100, Math.round((score / maxPoints) * 100)) : 0;
  const badgeStyle = BADGE_STYLES[badge];
  const isManual = badge === 'MANUAL';
  const metricNoteCount = notes.filter((n) => n.metricId === metricId).length;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-4 py-3">
        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800">{name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeStyle.cls}`}>
              {badgeStyle.label}
            </span>
            <span className="text-[11px] text-gray-400">{Math.round(weightage * 100)}%</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{subTitle}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 italic">{scoringDescription}</p>
        </div>

        {/* Score + bar */}
        <div className="w-36 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold" style={{ color: textColor }}>
              {score !== null ? score.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-gray-400">/ {maxPoints}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: score !== null ? barColor : '#E5E7EB' }}
            />
          </div>
          <div className="text-right mt-0.5">
            <span className="text-[10px] text-gray-400">{pct}%</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex-shrink-0 flex flex-col gap-1 mt-0.5">
          {/* Formula info */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="How it's calculated"
          >
            {expanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
              </svg>
            )}
          </button>

          {/* Notes toggle (MANUAL metrics only, or when notes exist) */}
          {(isManual || metricNoteCount > 0) && userId && period && (
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors relative ${
                notesOpen ? 'bg-amber-100 text-amber-600' : 'text-amber-400 hover:text-amber-600 hover:bg-amber-50'
              }`}
              title="PM Notes"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {metricNoteCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {metricNoteCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expandable formula + example */}
      {expanded && (
        <div className="mb-3 ml-1 mr-7 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">How it's calculated</p>
          </div>
          <div className="px-4 py-3 space-y-2.5">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 mb-1">Formula</p>
              <p className="text-xs text-gray-700 font-mono leading-relaxed bg-white rounded border border-gray-200 px-3 py-2">
                {formula}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 mb-1">Example</p>
              <div className="bg-blue-50 border border-blue-100 rounded px-3 py-2">
                {example.split('\n').map((line, i) => (
                  <p key={i} className="text-xs text-blue-800 leading-relaxed">{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes panel */}
      {notesOpen && userId && period && (
        <MetricNotes
          metricId={metricId}
          userId={userId}
          period={period}
          canAddNotes={canAddNotes}
          notes={notes}
          onAdd={(content) => onAddNote(metricId, content)}
          onDelete={onDeleteNote}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isAdding={isAdding}
        />
      )}
    </div>
  );
}

// ── Sub-group ─────────────────────────────────────────────────────────────────

interface SubGroupSectionProps {
  subGroup: KpiSubCategoryGroup;
  scores: KpiMetricScore[];
  barColor: string;
  textColor: string;
  userId?: string;
  period?: string;
  canAddNotes: boolean;
  notes: KpiNote[];
  onAddNote: (metricId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  isAdding: boolean;
}

function SubGroupSection({ subGroup, scores, barColor, textColor, userId, period, canAddNotes, notes, onAddNote, onDeleteNote, currentUserId, isAdmin, isAdding }: SubGroupSectionProps) {
  return (
    <div className="mb-4 last:mb-0">
      {subGroup.name && (
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {subGroup.name}
          </h4>
          <span className="text-xs text-gray-400">{subGroup.maxPoints} pts</span>
        </div>
      )}
      <div>
        {subGroup.metrics.map((m) => {
          const scoreObj = scores.find((s) => s.metricId === m.id);
          return (
            <MetricRow
              key={m.id}
              metricId={m.id}
              name={m.name}
              subTitle={m.subTitle}
              badge={m.badge}
              maxPoints={m.maxPoints}
              weightage={m.weightage}
              scoringDescription={m.scoringDescription}
              formula={m.formula}
              example={m.example}
              score={scoreObj?.points ?? null}
              barColor={barColor}
              textColor={textColor}
              userId={userId}
              period={period}
              canAddNotes={canAddNotes}
              notes={notes}
              onAddNote={onAddNote}
              onDeleteNote={onDeleteNote}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              isAdding={isAdding}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Core value section ────────────────────────────────────────────────────────

interface CoreValueSectionProps {
  group: KpiCoreValueGroup;
  scores: KpiMetricScore[];
  earnedTotal: number;
  userId?: string;
  period?: string;
  canAddNotes: boolean;
  notes: KpiNote[];
  onAddNote: (metricId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  isAdding: boolean;
}

function CoreValueSection({ group, scores, earnedTotal, userId, period, canAddNotes, notes, onAddNote, onDeleteNote, currentUserId, isAdmin, isAdding }: CoreValueSectionProps) {
  const pct = Math.min(100, Math.round((earnedTotal / group.maxPoints) * 100));

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: `1px solid ${group.borderColor}` }}>
      {/* Header — spreadsheet color */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: group.headerColor }}
      >
        <h3 className="text-sm font-bold tracking-wide" style={{ color: group.headerTextColor }}>
          {group.coreValue}
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${group.headerTextColor}30` }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: group.barColor }}
            />
          </div>
          <span className="text-sm font-semibold min-w-[80px] text-right" style={{ color: group.headerTextColor }}>
            {earnedTotal.toFixed(1)} / {group.maxPoints}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3" style={{ backgroundColor: group.bodyColor }}>
        {group.subGroups.map((sg, i) => (
          <SubGroupSection
            key={i}
            subGroup={sg}
            scores={scores}
            barColor={group.barColor}
            textColor={group.textColor}
            userId={userId}
            period={period}
            canAddNotes={canAddNotes}
            notes={notes}
            onAddNote={onAddNote}
            onDeleteNote={onDeleteNote}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isAdding={isAdding}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface KpiParameterGroupsProps {
  scores: KpiMetricScore[];
  totalScore: number;
  /** Employee being viewed — needed to load/save notes */
  userId?: string;
  period?: string;
  /** Whether the current viewer can add notes (PM / admin) */
  canAddNotes?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function KpiParameterGroups({
  scores,
  totalScore,
  userId,
  period,
  canAddNotes = false,
  currentUserId,
  isAdmin = false,
}: KpiParameterGroupsProps) {
  const queryClient = useQueryClient();

  const notesKey = ['kpi-notes', userId, period];

  const { data: notes = [] } = useQuery({
    queryKey: notesKey,
    queryFn: () => analyticsApi.getKpiNotes(userId!, period!),
    enabled: !!userId && !!period,
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: (vars: { metricId: string; content: string }) =>
      analyticsApi.addKpiNote({ userId: userId!, metricId: vars.metricId, period: period!, content: vars.content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => analyticsApi.deleteKpiNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey }),
  });

  function earnedForGroup(group: KpiCoreValueGroup): number {
    const allMetricIds = group.subGroups.flatMap((sg) => sg.metrics.map((m) => m.id));
    return scores
      .filter((s) => allMetricIds.includes(s.metricId))
      .reduce((sum, s) => sum + s.points, 0);
  }

  return (
    <div className="space-y-4">
      {/* Overall KPI Score — progress bar */}
      {(() => {
        const grade = computeGrade(totalScore);
        const gradeStyle = GRADE_CONFIG[grade];
        const pct = Math.min(100, Math.max(0, totalScore));
        const barColor =
          pct >= 90 ? '#10B981' : pct >= 75 ? '#3B82F6' : pct >= 60 ? '#F59E0B' : '#EF4444';
        return (
          <div className="bg-white rounded-xl border border-[#cccccc] shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Overall KPI Score
              </p>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeStyle.bg} ${gradeStyle.text}`}>
                Grade {grade} — {gradeStyle.label}
              </span>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-gray-900 leading-none">{totalScore.toFixed(1)}</p>
              <p className="text-sm text-gray-400 mb-0.5">/ 100</p>
            </div>
            <div className="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400">0</span>
              <span className="text-[10px] text-gray-400">100</span>
            </div>
          </div>
        );
      })()}

      {/* Legend row */}
      <div className="flex items-center gap-4 px-1 flex-wrap">
        <span className="text-xs text-gray-500">Scoring type:</span>
        {Object.entries(BADGE_STYLES).map(([key, { label, cls }]) => (
          <span key={key} className={`text-[10px] font-semibold px-2 py-0.5 rounded ${cls}`}>
            {label}
          </span>
        ))}
        <span className="text-[10px] text-gray-400 ml-auto flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          ⓘ = formula · ✏️ = PM notes
        </span>
      </div>

      {/* Core value groups */}
      {KPI_CORE_VALUE_GROUPS.map((group) => (
        <CoreValueSection
          key={group.coreValue}
          group={group}
          scores={scores}
          earnedTotal={earnedForGroup(group)}
          userId={userId}
          period={period}
          canAddNotes={canAddNotes}
          notes={notes}
          onAddNote={(metricId, content) => addMutation.mutate({ metricId, content })}
          onDeleteNote={(noteId) => deleteMutation.mutate(noteId)}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isAdding={addMutation.isPending}
        />
      ))}
    </div>
  );
}

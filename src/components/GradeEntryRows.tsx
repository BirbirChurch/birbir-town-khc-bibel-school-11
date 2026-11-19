import React, { useCallback } from 'react';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';
import { AssessmentCriterionItem, GradeBreakdown, Student } from '../types.ts';
import {
  calculateGradeDetails,
  getCriterionScore,
  getEffectiveGradeValues
} from '../utils/gradeCalculations.ts';
import { FastScoreInput, FastTextInput } from './FastScoreInput.tsx';
import { useLanguage, formatCriterionLabel, formatGradeDesc } from '../utils/i18n.tsx';

export const ENTRY_CRITERIA_COLORS = [
  { border: 'border-emerald-300', focus: 'focus:ring-emerald-700' },
  { border: 'border-cyan-300', focus: 'focus:ring-cyan-700' },
  { border: 'border-indigo-300', focus: 'focus:ring-indigo-700' },
  { border: 'border-amber-300', focus: 'focus:ring-amber-700' },
  { border: 'border-purple-300', focus: 'focus:ring-purple-700' },
  { border: 'border-rose-300', focus: 'focus:ring-rose-700' },
  { border: 'border-teal-300', focus: 'focus:ring-teal-700' },
  { border: 'border-orange-300', focus: 'focus:ring-orange-700' }
];

export function getEntryCriterionColor(index: number) {
  return ENTRY_CRITERIA_COLORS[index % ENTRY_CRITERIA_COLORS.length];
}

// Hoisted static <option> lists so React reuses VDOM elements across all rows without per-row allocations
const STATIC_DESKTOP_SCALE_OPTIONS = OFFICIAL_GRADING_SCALE.map((tier) => (
  <option key={tier.letter} value={tier.letter}>
    {tier.letter} ({tier.points === 3.7 ? '3.70' : tier.points.toFixed(2)}) — {tier.min}%–{tier.max}%
  </option>
));

const STATIC_MOBILE_SCALE_OPTIONS = OFFICIAL_GRADING_SCALE.map((tier) => (
  <option key={tier.letter} value={tier.letter}>
    {tier.letter} ({tier.min}%–{tier.max}%)
  </option>
));

interface TeacherRowProps {
  student: Student;
  rowIndex: number;
  breakdown: GradeBreakdown | undefined;
  activeItems: AssessmentCriterionItem[];
  totalActiveWeight: number;
  onCriterionScoreChange: (
    studentUid: string,
    itemId: string,
    val: string,
    maxVal: number,
    itemIndex: number
  ) => void;
  onCustomTotalChange: (studentUid: string, val: string) => void;
  onCustomLetterChange: (studentUid: string, letter: string) => void;
  onCustomDescChange: (studentUid: string, desc: string) => void;
  onCellKeyDown: (e: React.KeyboardEvent<HTMLElement>, r: number, c: number) => void;
}

const EMPTY_BREAKDOWN: GradeBreakdown = { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };

export const TeacherGradeDesktopRow: React.FC<TeacherRowProps> = React.memo(
  ({
    student,
    rowIndex,
    breakdown,
    activeItems,
    onCriterionScoreChange,
    onCustomTotalChange,
    onCustomLetterChange,
    onCustomDescChange,
    onCellKeyDown
  }) => {
    const { lang, t } = useLanguage();
    const g = breakdown || EMPTY_BREAKDOWN;
    const partsSum = activeItems.reduce(
      (sum, it, itIdx) => sum + getCriterionScore(g, it.id, itIdx),
      0
    );
    const hasParts = partsSum > 0;
    const hasCustomTotal = typeof g.customTotal === 'number' && !Number.isNaN(g.customTotal);
    const eff = getEffectiveGradeValues(g, activeItems);
    const effectiveTotal = hasCustomTotal ? g.customTotal! : partsSum;
    const autoGrade = calculateGradeDetails(effectiveTotal);
    const defaultDesc = eff.hasAny ? formatGradeDesc(autoGrade.desc, lang) : t('አልተሞላም', 'Not Entered');

    const totalCellValue = hasCustomTotal
      ? g.customTotal === 0
        ? undefined
        : g.customTotal
      : hasParts
      ? partsSum
      : undefined;

    const handleSelectChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onCustomLetterChange(student.uid, e.target.value);
      },
      [onCustomLetterChange, student.uid]
    );

    const handleSelectKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLSelectElement>) => {
        onCellKeyDown(e, rowIndex, activeItems.length + 1);
      },
      [onCellKeyDown, rowIndex, activeItems.length]
    );

    return (
      <tr className="hover:bg-slate-50/80">
        <td className="p-2.5 font-mono text-slate-400">{rowIndex + 1}</td>
        <td className="p-2.5 font-mono font-bold text-slate-800">{student.id}</td>
        <td className="p-2.5 font-bold text-slate-900 sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] whitespace-nowrap">
          {student.name}
        </td>

        {activeItems.map((item, itemIdx) => {
          const color = getEntryCriterionColor(itemIdx);
          const score = getCriterionScore(g, item.id, itemIdx);
          return (
            <td key={item.id} className="p-2 text-center">
              <FastScoreInput
                value={score}
                min={0}
                max={item.max}
                step="0.5"
                placeholder="—"
                dataCellR={rowIndex}
                dataCellC={itemIdx}
                studentUid={student.uid}
                itemId={item.id}
                itemIndex={itemIdx}
                onCommitScore={onCriterionScoreChange}
                onNavigateCell={onCellKeyDown}
                className={`w-16 px-1.5 py-1 text-center font-mono font-bold text-xs border ${color.border} rounded-lg ${color.focus} bg-white placeholder:text-slate-300 focus:ring-2 focus:ring-amber-500`}
                title={`${formatCriterionLabel(item.label, lang)} (${t('ከ', 'Out of')} ${item.max}%) — ${t('በክይቦርድ ቀስቶች መንቀሳቀስ ይችላሉ', 'Use arrow keys to navigate')}`}
              />
            </td>
          );
        })}

        <td className="p-1 text-center bg-emerald-50/10 border-r border-dashed border-emerald-100"></td>

        <td className="p-2 text-center">
          <div className="relative inline-block">
            <FastScoreInput
              value={totalCellValue}
              emptyAsZero={false}
              min={0}
              max={100}
              step="0.5"
              placeholder="—"
              dataCellR={rowIndex}
              dataCellC={activeItems.length}
              studentUid={student.uid}
              onCommitStudentValue={onCustomTotalChange}
              onNavigateCell={onCellKeyDown}
              className={`w-18 px-1.5 py-1 text-center font-mono font-black text-xs rounded-lg border focus:ring-2 focus:ring-emerald-700 ${
                hasCustomTotal
                  ? 'border-indigo-400 bg-indigo-50/80 text-indigo-950 font-extrabold ring-1 ring-indigo-300'
                  : 'border-emerald-300 bg-emerald-50/50 text-emerald-900'
              } placeholder:text-slate-300`}
              title={
                hasCustomTotal
                  ? t('በቀጥታ በመምህሩ የተሞላ ድምር (Custom Total)። ለማስላት ባዶ አድርገው ይተዉት።', 'Custom Total entered manually. Clear to auto-calculate.')
                  : t('የተደመረ ድምር (በቀጥታ መተየብም ይችላሉ)', 'Auto-summed total (or type custom total)')
              }
            />
            {hasCustomTotal && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2" title={t('በእጅ የተሞላ ድምር', 'Manually entered total')}>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
            )}
          </div>
        </td>

        <td className="p-2 text-center">
          <select
            data-cell-r={rowIndex}
            data-cell-c={activeItems.length + 1}
            onKeyDown={handleSelectKeyDown}
            value={g.customLetter || ''}
            onChange={handleSelectChange}
            className={`w-20 px-1 py-1 text-center font-black text-xs rounded-lg border focus:ring-2 focus:ring-amber-500 cursor-pointer ${
              g.customLetter
                ? 'bg-amber-100/90 text-amber-950 border-amber-400 font-extrabold ring-1 ring-amber-300'
                : 'bg-amber-50/50 text-amber-900 border-amber-300'
            }`}
            title={t('የፊደል ደረጃን ኤዲት ማድረግ ይችላሉ', 'Override letter grade')}
          >
            <option value="">{eff.hasAny ? `${autoGrade.letter} (${t('አውቶ', 'Auto')})` : `— (${t('አውቶ', 'Auto')})`}</option>
            {STATIC_DESKTOP_SCALE_OPTIONS}
          </select>
        </td>

        <td className="p-2 text-center">
          <FastTextInput
            value={g.customDesc !== undefined ? g.customDesc : ''}
            placeholder={defaultDesc}
            dataCellR={rowIndex}
            dataCellC={activeItems.length + 2}
            studentUid={student.uid}
            onCommitStudentValue={onCustomDescChange}
            onNavigateCell={onCellKeyDown}
            className={`w-32 px-2 py-1 text-xs text-slate-800 rounded-lg border focus:ring-2 focus:ring-emerald-700 placeholder:text-slate-400 font-medium ${
              g.customDesc
                ? 'bg-blue-50/80 border-blue-400 text-blue-950 ring-1 ring-blue-300'
                : 'bg-white border-slate-300'
            }`}
            title={t('ትርጉሙን ወይም ልዩ አስተያየቱን ኤዲት ማድረግ ይችላሉ', 'Edit description or custom remark')}
          />
        </td>
      </tr>
    );
  }
);
TeacherGradeDesktopRow.displayName = 'TeacherGradeDesktopRow';

export const TeacherGradeMobileCard: React.FC<TeacherRowProps> = React.memo(
  ({
    student,
    rowIndex,
    breakdown,
    activeItems,
    totalActiveWeight,
    onCriterionScoreChange,
    onCustomTotalChange,
    onCustomLetterChange,
    onCustomDescChange
  }) => {
    const { lang, t } = useLanguage();
    const g = breakdown || EMPTY_BREAKDOWN;
    const partsSum = activeItems.reduce(
      (sum, it, itIdx) => sum + getCriterionScore(g, it.id, itIdx),
      0
    );
    const hasParts = partsSum > 0;
    const hasCustomTotal = typeof g.customTotal === 'number' && !Number.isNaN(g.customTotal);
    const eff = getEffectiveGradeValues(g, activeItems);
    const effectiveTotal = hasCustomTotal ? g.customTotal! : partsSum;
    const autoGrade = calculateGradeDetails(effectiveTotal);
    const defaultDesc = eff.hasAny ? formatGradeDesc(autoGrade.desc, lang) : t('አልተሞላም', 'Not Entered');

    const totalCellValue = hasCustomTotal
      ? g.customTotal === 0
        ? undefined
        : g.customTotal
      : hasParts
      ? partsSum
      : undefined;

    const handleSelectChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onCustomLetterChange(student.uid, e.target.value);
      },
      [onCustomLetterChange, student.uid]
    );

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2.5">
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-bold text-slate-400">
              #{rowIndex + 1} · {student.id}
            </span>
            <h4 className="font-bold text-sm text-slate-900 leading-snug">{student.name}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-950 text-center min-w-[46px]">
              <span className="block text-[9px] font-bold text-emerald-800">{t('ድምር', 'Total')}</span>
              <span className="font-mono font-black text-sm">{eff.hasAny ? eff.total : '—'}</span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 text-center min-w-[42px]">
              <span className="block text-[9px] font-bold text-amber-800">{t('ደረጃ', 'Grade')}</span>
              <span className="font-black text-sm">{eff.hasAny ? eff.letter : '—'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {activeItems.map((item, itemIdx) => {
            const color = getEntryCriterionColor(itemIdx);
            const score = getCriterionScore(g, item.id, itemIdx);
            return (
              <div key={item.id} className="bg-white rounded-xl p-2 border border-slate-200/80">
                <label className="block text-[10px] font-bold text-slate-600 truncate mb-1">
                  {formatCriterionLabel(item.label, lang)} <span className="font-mono text-slate-400">({item.max}%)</span>
                </label>
                <FastScoreInput
                  value={score}
                  min={0}
                  max={item.max}
                  step="0.5"
                  placeholder="0"
                  studentUid={student.uid}
                  itemId={item.id}
                  itemIndex={itemIdx}
                  onCommitScore={onCriterionScoreChange}
                  className={`w-full min-h-[42px] px-2.5 py-1.5 text-center font-mono font-bold text-base border ${color.border} rounded-lg ${color.focus} bg-slate-50`}
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[10px] font-bold text-emerald-800 mb-1">
              {t('ቀጥታ ድምር', 'Custom Total')} ({totalActiveWeight}%)
            </label>
            <FastScoreInput
              value={totalCellValue}
              emptyAsZero={false}
              min={0}
              max={100}
              step="0.5"
              placeholder="—"
              studentUid={student.uid}
              onCommitStudentValue={onCustomTotalChange}
              className="w-full min-h-[42px] px-2.5 py-1.5 text-center font-mono font-black text-base rounded-lg border border-emerald-300 bg-emerald-50/50 text-emerald-950"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-amber-800 mb-1">{t('ፊደል ደረጃ', 'Letter Grade')}</label>
            <select
              value={g.customLetter || ''}
              onChange={handleSelectChange}
              className="w-full min-h-[42px] px-2 py-1.5 text-center font-black text-sm rounded-lg border border-amber-300 bg-amber-50/60 text-amber-950"
            >
              <option value="">{eff.hasAny ? `${autoGrade.letter} (${t('አውቶ', 'Auto')})` : `— (${t('አውቶ', 'Auto')})`}</option>
              {STATIC_MOBILE_SCALE_OPTIONS}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">{t('ትርጉም / አስተያየት', 'Description / Remark')}</label>
          <FastTextInput
            value={g.customDesc !== undefined ? g.customDesc : ''}
            placeholder={defaultDesc}
            studentUid={student.uid}
            onCommitStudentValue={onCustomDescChange}
            className="w-full min-h-[42px] px-3 py-1.5 text-sm text-slate-800 rounded-lg border border-slate-300 bg-white"
          />
        </div>
      </div>
    );
  }
);
TeacherGradeMobileCard.displayName = 'TeacherGradeMobileCard';

interface StandardRowProps {
  student: Student;
  rowIndex?: number;
  breakdown: GradeBreakdown | undefined;
  criteria: AssessmentCriterionItem[];
  onScoreChange: (
    studentUid: string,
    itemId: string,
    val: string,
    maxVal: number,
    itemIndex: number
  ) => void;
  onCellKeyDown?: (e: React.KeyboardEvent<HTMLElement>, r: number, c: number) => void;
}

export const StandardGradeDesktopRow: React.FC<StandardRowProps> = React.memo(
  ({ student, rowIndex, breakdown, criteria, onScoreChange, onCellKeyDown }) => {
    const { lang } = useLanguage();
    const g = breakdown || EMPTY_BREAKDOWN;
    const eff = getEffectiveGradeValues(g, criteria);

    return (
      <tr className="hover:bg-slate-50">
        <td className="p-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">{student.id}</td>
        <td className="p-2.5 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] whitespace-nowrap">
          {student.name}
        </td>
        {criteria.map((it, idx) => {
          const score = getCriterionScore(g, it.id, idx);
          const color = getEntryCriterionColor(idx);
          return (
            <td key={it.id} className="p-1.5 text-center">
              <FastScoreInput
                value={score}
                min={0}
                max={it.max}
                step="0.5"
                placeholder="—"
                dataCellR={rowIndex}
                dataCellC={idx}
                studentUid={student.uid}
                itemId={it.id}
                itemIndex={idx}
                onCommitScore={onScoreChange}
                onNavigateCell={onCellKeyDown}
                className={`compact-cell-input w-14 px-1 py-1 text-center font-mono text-xs border ${color.border} rounded bg-white placeholder:text-slate-300`}
                title={`${formatCriterionLabel(it.label, lang)} (${it.max}%)`}
              />
            </td>
          );
        })}
        <td className="p-2.5 text-center font-black font-mono text-emerald-800">
          {eff.hasAny ? eff.total : '—'}
        </td>
        <td className="p-2.5 text-center font-black text-amber-700">
          {eff.hasAny ? eff.letter : '—'}
        </td>
        <td className="p-2.5 text-center font-bold font-mono">
          {eff.hasAny ? eff.points.toFixed(2) : '—'}
        </td>
      </tr>
    );
  }
);
StandardGradeDesktopRow.displayName = 'StandardGradeDesktopRow';

export const StandardGradeMobileCard: React.FC<StandardRowProps> = React.memo(
  ({ student, breakdown, criteria, onScoreChange }) => {
    const { lang } = useLanguage();
    const g = breakdown || EMPTY_BREAKDOWN;
    const eff = getEffectiveGradeValues(g, criteria);

    return (
      <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
        <div className="flex justify-between items-start gap-2 border-b border-slate-200 pb-2">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
            <p className="text-[11px] font-mono text-slate-500">ID: {student.id}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono font-black text-emerald-800 text-sm">
              {eff.hasAny ? `${eff.total}%` : '—'}
            </span>
            {eff.hasAny && (
              <span className="ml-1.5 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-xs">
                {eff.letter}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {criteria.map((it, idx) => {
            const score = getCriterionScore(g, it.id, idx);
            const color = getEntryCriterionColor(idx);
            return (
              <div key={it.id} className="bg-white p-2 rounded-xl border border-slate-200">
                <label className="block text-[10px] font-bold text-slate-600 truncate mb-1">
                  {formatCriterionLabel(it.label, lang)} ({it.max}%)
                </label>
                <FastScoreInput
                  value={score}
                  min={0}
                  max={it.max}
                  step="0.5"
                  placeholder="—"
                  studentUid={student.uid}
                  itemId={it.id}
                  itemIndex={idx}
                  onCommitScore={onScoreChange}
                  className={`w-full px-2 py-1.5 text-center font-mono text-sm font-bold border ${color.border} rounded-lg bg-slate-50 focus:bg-white`}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
StandardGradeMobileCard.displayName = 'StandardGradeMobileCard';

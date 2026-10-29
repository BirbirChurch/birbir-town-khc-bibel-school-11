import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCheck,
  Sparkles,
  SlidersHorizontal,
  Users,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Copy,
  ChevronDown
} from 'lucide-react';
import {
  AssessmentCriterionItem,
  Course,
  GradeBreakdown,
  Student
} from '../types.ts';
import {
  getCourseAssessmentItems,
  getCriterionScore,
  calculateGradeDetails
} from '../utils/gradeCalculations.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';

interface BatchScoreFillModalProps {
  course: Course;
  students: Student[];
  currentGrades: Record<string, GradeBreakdown>;
  initialCriterionId?: string;
  onApply: (updatedGrades: Record<string, GradeBreakdown>, summaryMsg: string) => void;
  onClose: () => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const BatchScoreFillModal: React.FC<BatchScoreFillModalProps> = ({
  course,
  students,
  currentGrades,
  initialCriterionId,
  onApply,
  onClose,
  showNotify
}) => {
  const criteria = useMemo(() => getCourseAssessmentItems(course), [course]);
  const enrolledStudents = useMemo(
    () => students.filter((s) => s.program === course.program),
    [students, course.program]
  );

  // Target selection: specific criterion ID, or 'TOTAL', or 'LETTER', or 'ALL_MAX'
  const defaultTarget = initialCriterionId || criteria[0]?.id || 'TOTAL';
  const [selectedTarget, setSelectedTarget] = useState<string>(defaultTarget);

  // Scope: 'ALL' (all enrolled students) or 'EMPTY_ONLY' (students without existing scores)
  const [fillScope, setFillScope] = useState<'ALL' | 'EMPTY_ONLY'>('ALL');

  // Selected criterion metadata
  const activeCriterion = criteria.find((c) => c.id === selectedTarget);
  const isTotalTarget = selectedTarget === 'TOTAL';
  const isLetterTarget = selectedTarget === 'LETTER';
  const isAllMaxTarget = selectedTarget === 'ALL_MAX';

  const maxPossible = useMemo(() => {
    if (isTotalTarget) return 100;
    if (activeCriterion) return Number(activeCriterion.max) || 100;
    return 100;
  }, [isTotalTarget, activeCriterion]);

  // Score states
  const [numericScore, setNumericScore] = useState<string>(
    activeCriterion ? String(activeCriterion.max) : '100'
  );
  const [selectedLetter, setSelectedLetter] = useState<string>('A');
  const [customDesc, setCustomDesc] = useState<string>('በጣም ከፍተኛ');
  const [showStudentList, setShowStudentList] = useState<boolean>(false);

  // Update default score when target changes
  const handleTargetChange = (newTarget: string) => {
    setSelectedTarget(newTarget);
    if (newTarget === 'TOTAL') {
      setNumericScore('100');
    } else if (newTarget === 'LETTER') {
      setSelectedLetter('A');
      setCustomDesc('በጣም ከፍተኛ');
    } else if (newTarget === 'ALL_MAX') {
      setNumericScore('');
    } else {
      const crit = criteria.find((c) => c.id === newTarget);
      if (crit) {
        setNumericScore(String(crit.max));
      }
    }
  };

  // Preset quick percentage click
  const handleApplyPresetPercent = (pct: number) => {
    const calculated = Math.round((maxPossible * (pct / 100)) * 10) / 10;
    setNumericScore(String(calculated));
  };

  // Determine which students will be affected
  const affectedStudents = useMemo(() => {
    return enrolledStudents.filter((s) => {
      if (fillScope === 'ALL') return true;

      const g = currentGrades[s.uid];
      if (!g) return true;

      if (isTotalTarget) {
        const hasCustom = typeof g.customTotal === 'number' && !isNaN(g.customTotal);
        if (hasCustom && g.customTotal! > 0) return false;
        const sum = criteria.reduce((acc, it, idx) => acc + getCriterionScore(g, it.id, idx), 0);
        return sum === 0;
      }

      if (isLetterTarget) {
        return !g.customLetter || g.customLetter === '—' || g.customLetter === 'NG';
      }

      if (isAllMaxTarget) {
        const sum = criteria.reduce((acc, it, idx) => acc + getCriterionScore(g, it.id, idx), 0);
        return sum === 0;
      }

      if (activeCriterion) {
        const critIdx = criteria.findIndex((c) => c.id === activeCriterion.id);
        const score = getCriterionScore(g, activeCriterion.id, critIdx);
        return score === 0;
      }

      return true;
    });
  }, [enrolledStudents, currentGrades, fillScope, isTotalTarget, isLetterTarget, isAllMaxTarget, activeCriterion, criteria]);

  // Handle Apply
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (affectedStudents.length === 0) {
      showNotify('ውጤት የሚሞላላቸው ተማሪዎች አልተገኙም (ሁሉም ተማሪዎች ውጤት ተሞልቶላቸዋል)!', 'warning');
      return;
    }

    const updated = { ...currentGrades };
    const parsedScore = parseFloat(numericScore) || 0;
    const clampedScore = Math.min(maxPossible, Math.max(0, parsedScore));

    affectedStudents.forEach((s) => {
      const current = updated[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const currentScores = current.scores ? { ...current.scores } : {};

      // Seed any missing criteria scores
      criteria.forEach((it, idx) => {
        if (currentScores[it.id] === undefined) {
          currentScores[it.id] = getCriterionScore(current, it.id, idx);
        }
      });

      if (isAllMaxTarget) {
        // Set all criteria to their maximum weight
        criteria.forEach((it, idx) => {
          currentScores[it.id] = it.max;
          if (it.id === 'p1' || idx === 0) current.p1 = it.max;
          if (it.id === 'p2' || idx === 1) current.p2 = it.max;
          if (it.id === 'mid' || idx === 2) current.mid = it.max;
          if (it.id === 'final' || idx === 3) current.final = it.max;
          if (it.id === 'att' || idx === 4) current.att = it.max;
        });

        updated[s.uid] = {
          ...current,
          scores: currentScores,
          customTotal: undefined, // let it sum automatically
          customLetter: undefined
        };
      } else if (isTotalTarget) {
        updated[s.uid] = {
          ...current,
          customTotal: clampedScore
        };
      } else if (isLetterTarget) {
        const matched = OFFICIAL_GRADING_SCALE.find((g) => g.letter === selectedLetter);
        updated[s.uid] = {
          ...current,
          customLetter: selectedLetter,
          customDesc: customDesc || matched?.desc
        };
      } else if (activeCriterion) {
        const critIdx = criteria.findIndex((c) => c.id === activeCriterion.id);
        currentScores[activeCriterion.id] = clampedScore;

        const updatedBreakdown: GradeBreakdown = {
          ...current,
          scores: currentScores,
          ...(activeCriterion.id === 'p1' || critIdx === 0 ? { p1: clampedScore } : {}),
          ...(activeCriterion.id === 'p2' || critIdx === 1 ? { p2: clampedScore } : {}),
          ...(activeCriterion.id === 'mid' || critIdx === 2 ? { mid: clampedScore } : {}),
          ...(activeCriterion.id === 'final' || critIdx === 3 ? { final: clampedScore } : {}),
          ...(activeCriterion.id === 'att' || critIdx === 4 ? { att: clampedScore } : {})
        };

        updated[s.uid] = updatedBreakdown;
      }
    });

    let targetLabel = '';
    if (isAllMaxTarget) {
      targetLabel = 'የሁሉም መመዘኛዎች ሙሉ ውጤት';
    } else if (isTotalTarget) {
      targetLabel = `ድምር ውጤት (${clampedScore}%)`;
    } else if (isLetterTarget) {
      targetLabel = `የፊደል ደረጃ (${selectedLetter})`;
    } else if (activeCriterion) {
      targetLabel = `'${activeCriterion.label}' (${clampedScore}/${activeCriterion.max}%)`;
    }

    const summaryMsg = `${targetLabel} ለ ${affectedStudents.length} ተማሪዎች በተሳካ ሁኔታ ተሞልቷል!`;
    onApply(updated, summaryMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 shadow-md">
              <CheckCheck className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  ተመሳሳይ ውጤት ለሁሉም ተማሪዎች መሙያ
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Bulk Fill
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1">
                ኮርስ፦ <strong className="text-white">{course.name}</strong> ({course.program === 'Degree' ? 'የዲግሪ' : 'የዲፕሎማ'} መርሃ-ግብር • {enrolledStudents.length} ተማሪዎች)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Instruction hint */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ጠቃሚ መመሪያ፦</span> ይህ ፈጣን መሳሪያ መምህሩ ወይም ዲኑ ለክፍሉ ተማሪዎች በሙሉ አንድ ዓይነት ውጤት (ለምሳሌ የተሳትፎ 10%፣ የአሳይመንት ሙሉ ነጥብ፣ ሚድ ፈተና ወይም ጠቅላላ ድምር) በአንድ ጊዜ እንዲሞሉ ያስችላል።
            </div>
          </div>

          {/* 1. Target Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>1. የሚሞላበትን የውጤት ዓይነት / መመዘኛ ይምረጡ፦</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {criteria.length} መመዘኛዎች ተገኝተዋል
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedTarget}
                onChange={(e) => handleTargetChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 focus:bg-white rounded-2xl text-xs sm:text-sm font-bold text-slate-800 outline-none transition-all cursor-pointer appearance-none"
              >
                <optgroup label="የተናጠል የውጤት መመዘኛዎች (Criteria)">
                  {criteria.map((c, idx) => (
                    <option key={c.id} value={c.id}>
                      {idx + 1}. {c.label} (ከ {c.max}% ውስጥ)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="አጠቃላይ ውጤት (Total / Grade)">
                  <option value="TOTAL">★ ድምር ውጤት (Total 100%) - በቀጥታ ድምር መሙላት</option>
                  <option value="LETTER">★ የፊደል ደረጃ (Letter Grade - A+, A, B...) በቀጥታ መምረጥ</option>
                  <option value="ALL_MAX">★ ለሁሉም መመዘኛዎች ሙሉ ውጤት (100% Full Mark to All)</option>
                </optgroup>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* 2. Score Input Area */}
          {!isAllMaxTarget && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">
                  2. {isLetterTarget ? 'የሚሰጠውን የፊደል ደረጃ ይምረጡ፦' : 'የሚሞላውን ውጤት መጠን ያስገቡ፦'}
                </label>
                {!isLetterTarget && (
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">
                    ከፍተኛው፦ {maxPossible}%
                  </span>
                )}
              </div>

              {isLetterTarget ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ደረጃ (Letter)</label>
                    <select
                      value={selectedLetter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedLetter(val);
                        const matched = OFFICIAL_GRADING_SCALE.find((g) => g.letter === val);
                        if (matched) setCustomDesc(matched.desc);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-800 outline-none"
                    >
                      {OFFICIAL_GRADING_SCALE.map((g) => (
                        <option key={g.letter} value={g.letter}>
                          {g.letter} ({g.min}-{g.max}%) — {g.desc} ({g.points} pts)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ትርጉም / አስተያየት</label>
                    <input
                      type="text"
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      placeholder="ምሳሌ፦ በጣም ከፍተኛ"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={maxPossible}
                      value={numericScore}
                      onChange={(e) => setNumericScore(e.target.value)}
                      required
                      placeholder={`ከ 0 እስከ ${maxPossible}`}
                      className="w-36 px-3.5 py-2 text-center text-lg font-mono font-black border-2 border-emerald-500 rounded-xl bg-white text-slate-900 outline-none shadow-xs focus:ring-2 focus:ring-emerald-400"
                    />
                    <span className="text-xs text-slate-600 font-bold">
                      / {maxPossible}% {isTotalTarget ? '(ጠቅላላ ድምር)' : `(${activeCriterion?.label || 'መመዘኛ'})`}
                    </span>
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500">ፈጣን አሞላል፦</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetPercent(100)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer shadow-2xs"
                    >
                      ሙሉ ውጤት ({maxPossible}%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetPercent(90)}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors cursor-pointer"
                    >
                      90%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetPercent(85)}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors cursor-pointer"
                    >
                      85%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetPercent(80)}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors cursor-pointer"
                    >
                      80%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetPercent(50)}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors cursor-pointer"
                    >
                      50% (ግማሽ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNumericScore('0')}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                    >
                      0 (ባዶ)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isAllMaxTarget && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs text-emerald-950 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">ለሁሉም መመዘኛዎች ሙሉ ውጤት (Full Mark) ይሰጣል</p>
                <p className="mt-1 text-emerald-800">
                  በዚህ ምርጫ እያንዳንዱ ተማሪ በሁሉም የኮርሱ መመዘኛዎች ({criteria.map((c) => `${c.label}: ${c.max}%`).join('፣ ')}) ሙሉ ነጥብ የሚያገኝ ሲሆን ድምሩ 100% (A+) ይሆናል።
                </p>
              </div>
            </div>
          )}

          {/* 3. Scope Selector (ማን ላይ ይተገበር?) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              3. ውጤቱ ለማን ተማሪዎች ይሞላ? (የትግበራ ወሰን)፦
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  fillScope === 'ALL'
                    ? 'border-emerald-600 bg-emerald-50/50 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="fillScope"
                  checked={fillScope === 'ALL'}
                  onChange={() => setFillScope('ALL')}
                  className="mt-0.5 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black block text-slate-900">
                    ለሁሉም ተማሪዎች ({enrolledStudents.length})
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    ቀድሞ የተሞላ ውጤት ቢኖርም ጭምር በአዲሱ ይቀየራል።
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  fillScope === 'EMPTY_ONLY'
                    ? 'border-emerald-600 bg-emerald-50/50 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="fillScope"
                  checked={fillScope === 'EMPTY_ONLY'}
                  onChange={() => setFillScope('EMPTY_ONLY')}
                  className="mt-0.5 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black block text-slate-900">
                    ባዶ ለሆኑት ብቻ
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    እስካሁን ውጤት ላልተሞላላቸው (0 ለሆኑ) ተማሪዎች ብቻ ይሞላል።
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 4. Preview Banner of Affected Students */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Users className="w-4 h-4 text-emerald-800" />
                <span>
                  ተጠቃሚ የሚሆኑ ተማሪዎች፦{' '}
                  <strong className="text-emerald-900 font-mono text-sm font-black">
                    {affectedStudents.length}
                  </strong>{' '}
                  ተማሪዎች (ከ {enrolledStudents.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentList(!showStudentList)}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                {showStudentList ? 'ዝርዝር ደብቅ' : 'የተማሪዎችን ስም አሳይ'}
              </button>
            </div>

            {showStudentList && (
              <div className="max-h-36 overflow-y-auto bg-white p-2.5 rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                {affectedStudents.map((s, idx) => (
                  <div key={s.uid} className="py-1 flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-mono">{idx + 1}. {s.id}</span>
                    <span className="font-bold text-slate-800">{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ሰርዝ (Cancel)
            </button>

            <button
              type="submit"
              disabled={affectedStudents.length === 0}
              className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                affectedStudents.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white hover:shadow-lg'
              }`}
            >
              <CheckCheck className="w-4 h-4 text-amber-300" />
              <span>ተግብር እና መዝግብ ({affectedStudents.length} ተማሪዎች)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

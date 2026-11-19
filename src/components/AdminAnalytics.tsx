import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { Course, GradeBreakdown, Student } from '../types.ts';
import { getCourseAssessmentItems, getCriterionScore, getEffectiveGradeValues, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Users, Award, BookOpen, Filter, Calendar, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useLanguage, formatCourseTitle, formatProgram, formatTeacherDisplay, formatCalendarYear, formatSemester, formatGradeDesc, formatCriterionLabel } from '../utils/i18n.tsx';

interface AdminAnalyticsProps {
  students: Student[];
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  students,
  courses,
  grades,
  currentYear,
  currentSemester
}) => {
  const { lang, t } = useLanguage();
  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');

  // Available Academic Years extracted from courses & props
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYear);
    courses.forEach((c) => {
      if (c.academicYear) set.add(c.academicYear);
    });
    return Array.from(set).sort();
  }, [courses, currentYear]);

  // Filtered Course List based on Program, Semester, Course selection
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (selectedProgram !== 'ALL' && c.program !== selectedProgram) return false;
      if (selectedCourseId !== 'ALL' && c.id !== selectedCourseId) return false;
      if (selectedSemester !== 'ALL' && c.semester && c.semester !== selectedSemester) return false;
      return true;
    });
  }, [courses, selectedProgram, selectedCourseId, selectedSemester]);

  // 1. Program Breakdown Data for Bar Chart
  const programData = useMemo(() => {
    const diplomaStudents = students.filter((s) => s.program === 'Diploma');
    const degreeStudents = students.filter((s) => s.program === 'Degree');

    const diplomaYear1 = diplomaStudents.filter((s) => !s.currentStudyYear || s.currentStudyYear === 1).length;
    const diplomaYear2 = diplomaStudents.filter((s) => s.currentStudyYear === 2).length;

    const degreeYear1 = degreeStudents.filter((s) => !s.currentStudyYear || s.currentStudyYear === 1).length;
    const degreeYear2 = degreeStudents.filter((s) => s.currentStudyYear === 2).length;
    const degreeYear3 = degreeStudents.filter((s) => s.currentStudyYear === 3).length;

    return [
      {
        name: t('የዲፕሎማ ፕሮግራም (Diploma)', 'Diploma Program'),
        ጠቅላላ_ተማሪዎች: diplomaStudents.length,
        '1ኛ_ዓመት': diplomaYear1,
        '2ኛ_ዓመት_ተመራቂ': diplomaYear2
      },
      {
        name: t('የድግሪ ፕሮግራም (Degree)', 'Degree Program'),
        ጠቅላላ_ተማሪዎች: degreeStudents.length,
        '1ኛ_ዓመት': degreeYear1,
        '2ኛ_ዓመት': degreeYear2,
        '3ኛ_ዓመት_ተመራቂ': degreeYear3
      }
    ];
  }, [students, lang]);

  // 2. Main Grade Distribution Analytics & Recharts Data
  const analyticsData = useMemo(() => {
    const gradeCounts: Record<string, number> = {
      'A+': 0, 'A': 0, 'A-': 0,
      'B+': 0, 'B': 0, 'B-': 0,
      'C+': 0, 'C': 0, 'C-': 0,
      'D+': 0, 'D': 0, 'D-': 0,
      'F': 0
    };

    let totalScoreSum = 0;
    let evaluatedCount = 0;
    let passCount = 0;
    let failCount = 0;
    let maxScore = -1;
    let minScore = 101;

    const criteriaSum: Record<string, { label: string; sum: number; max: number; count: number }> = {};

    const courseStatsList: Array<{
      courseId: string;
      courseCode: string;
      courseName: string;
      program: string;
      instructor: string;
      enrolledCount: number;
      evaluatedCount: number;
      avgScore: number;
      passRate: number;
      topGrade: string;
    }> = [];

    const targetYear = selectedYear === 'ALL' ? currentYear : selectedYear;
    const targetSem = selectedSemester;

    filteredCourses.forEach((course) => {
      const enrolled = students.filter((s) => s.program === course.program);
      const criteria = getCourseAssessmentItems(course);

      criteria.forEach((item) => {
        if (!criteriaSum[item.id]) {
          criteriaSum[item.id] = { label: item.label, sum: 0, max: item.max, count: 0 };
        }
      });

      let cSum = 0;
      let cEval = 0;
      let cPass = 0;
      const cGradeCounts: Record<string, number> = {};

      enrolled.forEach((student) => {
        const breakdown = resolveGradeBreakdown(
          grades,
          student.uid,
          course.id,
          targetYear,
          targetSem,
          student.id
        );
        const eff = getEffectiveGradeValues(breakdown, criteria);

        if (eff.hasAny) {
          evaluatedCount++;
          totalScoreSum += eff.total;
          cSum += eff.total;
          cEval++;

          if (eff.total > maxScore) maxScore = eff.total;
          if (eff.total < minScore) minScore = eff.total;

          if (eff.total >= 60) {
            passCount++;
            cPass++;
          } else {
            failCount++;
          }

          const letter = eff.letter;
          if (gradeCounts[letter] !== undefined) {
            gradeCounts[letter]++;
          } else {
            gradeCounts['F']++;
          }

          cGradeCounts[letter] = (cGradeCounts[letter] || 0) + 1;

          criteria.forEach((item, idx) => {
            const score = getCriterionScore(breakdown, item.id, idx);
            if (criteriaSum[item.id]) {
              criteriaSum[item.id].sum += score;
              criteriaSum[item.id].count++;
            }
          });
        }
      });

      let topGrade = '—';
      let maxGCount = 0;
      Object.entries(cGradeCounts).forEach(([g, cnt]) => {
        if (cnt > maxGCount) {
          maxGCount = cnt;
          topGrade = g;
        }
      });

      courseStatsList.push({
        courseId: course.id,
        courseCode: course.code || course.id.toUpperCase(),
        courseName: course.name,
        program: course.program,
        instructor: course.teacher,
        enrolledCount: enrolled.length,
        evaluatedCount: cEval,
        avgScore: cEval > 0 ? Math.round((cSum / cEval) * 10) / 10 : 0,
        passRate: cEval > 0 ? Math.round((cPass / cEval) * 100) : 0,
        topGrade
      });
    });

    // Bar chart data for all 13 official grade distribution tiers
    const letterGradeBarData = [
      { grade: 'A+', ተማሪዎች_ብዛት: gradeCounts['A+'] || 0, range: '97–100%', fill: '#047857', desc: formatGradeDesc('እጅግ በጣም ጥሩ', lang) },
      { grade: 'A',  ተማሪዎች_ብዛት: gradeCounts['A'] || 0,  range: '93–96%',  fill: '#059669', desc: formatGradeDesc('በጣም ጥሩ', lang) },
      { grade: 'A-', ተማሪዎች_ብዛት: gradeCounts['A-'] || 0, range: '90–92%',  fill: '#10b981', desc: formatGradeDesc('በጣም ጥሩ', lang) },
      { grade: 'B+', ተማሪዎች_ብዛት: gradeCounts['B+'] || 0, range: '87–89%',  fill: '#1d4ed8', desc: formatGradeDesc('ጥሩ', lang) },
      { grade: 'B',  ተማሪዎች_ብዛት: gradeCounts['B'] || 0,  range: '83–86%',  fill: '#2563eb', desc: formatGradeDesc('ጥሩ', lang) },
      { grade: 'B-', ተማሪዎች_ብዛት: gradeCounts['B-'] || 0, range: '80–82%',  fill: '#3b82f6', desc: formatGradeDesc('ደህና', lang) },
      { grade: 'C+', ተማሪዎች_ብዛት: gradeCounts['C+'] || 0, range: '77–79%',  fill: '#d97706', desc: formatGradeDesc('አጥጋቢ', lang) },
      { grade: 'C',  ተማሪዎች_ብዛት: gradeCounts['C'] || 0,  range: '73–76%',  fill: '#f59e0b', desc: formatGradeDesc('አልፏል', lang) },
      { grade: 'C-', ተማሪዎች_ብዛት: gradeCounts['C-'] || 0, range: '70–72%',  fill: '#fbbf24', desc: formatGradeDesc('ዝቅተኛ ማለፊያ', lang) },
      { grade: 'D+', ተማሪዎች_ብዛት: gradeCounts['D+'] || 0, range: '67–69%',  fill: '#ea580c', desc: formatGradeDesc('ዝቅተኛ', lang) },
      { grade: 'D',  ተማሪዎች_ብዛት: gradeCounts['D'] || 0,  range: '63–66%',  fill: '#f97316', desc: formatGradeDesc('ዝቅተኛ / ማለፊያ', lang) },
      { grade: 'D-', ተማሪዎች_ብዛት: gradeCounts['D-'] || 0, range: '60–62%',  fill: '#fb923c', desc: formatGradeDesc('ዝቅተኛ', lang) },
      { grade: 'F',  ተማሪዎች_ብዛት: gradeCounts['F'] || 0,  range: '0–59%',   fill: '#dc2626', desc: formatGradeDesc('ወድቋል', lang) }
    ];

    // Pie chart data for Pass vs Fail
    const piePassFailData = [
      { name: t('ያለፉ (Pass >= 60%)', 'Passed (>= 60%)'), value: passCount, fill: '#10b981' },
      { name: t('የወደቁ (Fail < 60%)', 'Failed (< 60%)'), value: failCount, fill: '#dc2626' }
    ].filter((item) => item.value > 0);

    // Criteria Averages Bar Chart
    const assessmentCriteriaData = Object.values(criteriaSum)
      .filter((c) => c.count > 0)
      .map((c) => ({
        item: formatCriterionLabel(c.label, lang),
        አማካይ_ውጤት: Math.round((c.sum / c.count) * 10) / 10,
        ከፍተኛ_ነጥብ: c.max,
        በመቶኛ: Math.round(((c.sum / c.count) / (c.max || 1)) * 100)
      }));

    const avgScoreVal = evaluatedCount > 0 ? (totalScoreSum / evaluatedCount).toFixed(1) : '0.0';
    const passRateVal = evaluatedCount > 0 ? ((passCount / evaluatedCount) * 100).toFixed(0) : '0';

    return {
      letterGradeBarData,
      piePassFailData,
      assessmentCriteriaData,
      courseStatsList,
      evaluatedCount,
      avgScoreVal,
      passRateVal,
      passCount,
      failCount,
      highestScore: maxScore >= 0 ? maxScore : 0,
      lowestScore: minScore <= 100 ? minScore : 0
    };
  }, [filteredCourses, students, grades, selectedYear, selectedSemester, currentYear, lang]);

  // Reset Filters to Default
  const handleResetFilters = () => {
    setSelectedYear(currentYear);
    setSelectedSemester('ALL');
    setSelectedCourseId('ALL');
    setSelectedProgram('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-purple-900/60">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              <TrendingUp className="w-4 h-4" />
              <span>{t('የተማሪዎችና የውጤት ዳታ ትንተና', 'Student & Grade Data Analytics')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-amber-400" />
              <span>{t('የአካዳሚክ ስታቲስቲክስና የውጤት ስርጭት ግራፍ', 'Academic Statistics & Grade Distribution')}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {t(
                'በትምህርት ኮርስ፣ በሴሚስተር እና በፕሮግራም የተማሪዎችን የውጤት ስርጭት (A, B, C, D, F) በባር እና ፓይ ግራፍ ይመልከቱ።',
                'Explore student grade distributions (A+ to F), pass rates, and assessment averages by course, semester, and program.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-purple-200 font-bold block uppercase">{t('የተፈተኑ ውጤቶች', 'Evaluated')}</span>
              <strong className="text-xl font-black text-white font-mono">{analyticsData.evaluatedCount}</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-purple-200 font-bold block uppercase">{t('አማካይ ውጤት', 'Average Score')}</span>
              <strong className="text-xl font-black text-amber-300 font-mono">{analyticsData.avgScoreVal}%</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-purple-200 font-bold block uppercase">{t('የማለፍ ምጣኔ', 'Pass Rate')}</span>
              <strong className="text-xl font-black text-emerald-300 font-mono">{analyticsData.passRateVal}%</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-purple-200 font-bold block uppercase">{t('ከፍተኛ ውጤት', 'Top Score')}</span>
              <strong className="text-xl font-black text-cyan-300 font-mono">{analyticsData.highestScore}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-purple-700" />
            <span>{t('የግራፍ ማጣሪያዎችና መምረጫዎች', 'Analytics Interactive Filters')}</span>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-purple-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-slate-100 hover:bg-purple-50 px-3 py-1 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('ማጣሪያዎችን እንደነበሩ መልስ', 'Reset Filters')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Course Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              <span>{t('የትምህርት ኮርስ:', 'Course:')}</span>
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full p-2.5 text-xs font-bold border rounded-2xl bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-600 cursor-pointer"
            >
              <option value="ALL">{t(`ሁሉም ኮርሶች (${courses.length})`, `All Courses (${courses.length})`)}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{formatProgram(c.program, lang)}] {c.code ? `${c.code} - ` : ''}{formatCourseTitle(c.name, lang)} ({formatTeacherDisplay(c.teacher, lang)})
                </option>
              ))}
            </select>
          </div>

          {/* Semester Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('ሴሚስተር:', 'Semester:')}</span>
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full p-2.5 text-xs font-bold border rounded-2xl bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-600 cursor-pointer"
            >
              <option value="ALL">{t('ሁሉም ሴሚስተሮች', 'All Semesters')}</option>
              <option value="1">{formatSemester('1', lang)}</option>
              <option value="2">{formatSemester('2', lang)}</option>
            </select>
          </div>

          {/* Academic Year Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('የትምህርት ዘመን:', 'Academic Year:')}</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2.5 text-xs font-bold border rounded-2xl bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-600 cursor-pointer"
            >
              <option value="ALL">{t('ሁሉም ዓመታት', 'All Years')}</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {formatCalendarYear(yr, lang)}
                </option>
              ))}
            </select>
          </div>

          {/* Program Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('ፕሮግራም:', 'Program:')}</span>
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full p-2.5 text-xs font-bold border rounded-2xl bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-600 cursor-pointer"
            >
              <option value="ALL">{t('ሁሉም ፕሮግራሞች (Diploma & Degree)', 'All Programs (Diploma & Degree)')}</option>
              <option value="Diploma">{t('የዲፕሎማ ፕሮግራም', 'Diploma Program')}</option>
              <option value="Degree">{t('የድግሪ ፕሮግራም', 'Degree Program')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Bar Chart: Grade Distribution (A+, A, B+, B, C+, C, D, F) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col space-y-4">
        <div className="border-b pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-700" />
              <span>{t('የፊደል ውጤቶች ስርጭት ባር ግራፍ (13-Tier: A+ እስከ F)', '13-Tier Grade Distribution (A+ to F)')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('የተመረጠው፦', 'Selected:')}{' '}
              {selectedCourseId === 'ALL'
                ? t('ሁሉም ኮርሶች', 'All Courses')
                : formatCourseTitle(courses.find((c) => c.id === selectedCourseId)?.name, lang)}
              {' | '} {t('ሴሚስተር:', 'Semester:')} {selectedSemester === 'ALL' ? t('ሁሉም', 'All') : formatSemester(selectedSemester, lang)}
              {' | '} {t('የትምህርት ዘመን:', 'Year:')} {selectedYear === 'ALL' ? t('ሁሉም', 'All') : formatCalendarYear(selectedYear, lang)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-purple-50 text-purple-900 font-mono text-xs font-bold px-3 py-1 rounded-xl border border-purple-200">
              {t('ጠቅላላ ተፈታኞች:', 'Evaluated:')} {analyticsData.evaluatedCount}
            </span>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-80 sm:h-96 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.letterGradeBarData}
              margin={{ top: 20, right: 25, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="grade"
                tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 800 }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '16px',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
                }}
                formatter={(value: any, _: any, item: any) => [
                  `${value} ${t('ተማሪዎች', 'students')} (${item.payload.desc} - ${item.payload.range})`,
                  t('የተማሪዎች ብዛት', 'Student Count')
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              <Bar
                dataKey="ተማሪዎች_ብዛት"
                name={t('የተማሪዎች ብዛት በውጤት ደረጃ', 'Students per Grade Tier')}
                radius={[8, 8, 0, 0]}
              >
                {analyticsData.letterGradeBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Breakdown Color Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5 pt-3 border-t text-xs">
          {analyticsData.letterGradeBarData.map((g) => (
            <div
              key={g.grade}
              className="p-2.5 rounded-2xl border flex flex-col justify-between text-center"
              style={{ backgroundColor: `${g.fill}10`, borderColor: `${g.fill}40` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm" style={{ color: g.fill }}>{g.grade}</span>
                <span className="text-[10px] text-slate-500 font-mono">{g.range}</span>
              </div>
              <strong className="text-lg font-black text-slate-900 font-mono my-0.5">{g.ተማሪዎች_ብዛት}</strong>
              <span className="text-[10px] text-slate-600 truncate">{g.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid of 2 Secondary Charts: Pass/Fail Donut & Criteria Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass vs Fail Donut Chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-700" />
                <span>{t('የማለፍና የመውደቅ ምጣኔ (Pass vs. Fail)', 'Pass vs. Fail Breakdown')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('ከ60% እና ከዚያ በላይ ያመጡ (ያለፉ) ከወደቁት ተማሪዎች ጋር ሲነፃፀሩ', 'Comparison of passing grades (>= 60%) vs failing (< 60%)')}
              </p>
            </div>
            <span className="bg-emerald-50 text-emerald-800 font-mono text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-200">
              {t('ማለፍ:', 'Pass:')} {analyticsData.passRateVal}%
            </span>
          </div>

          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.piePassFailData.length > 0 ? analyticsData.piePassFailData : [{ name: t('ምንም ዳታ የለም', 'No Data'), value: 1, fill: '#cbd5e1' }]}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={50}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${(name || '').split(' ')[0]} (${(((percent as number) || 0) * 100).toFixed(0)}%)`}
                >
                  {analyticsData.piePassFailData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: any) => [`${val} ${t('ተማሪዎች', 'students')}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 block font-bold">{t('ያለፉ ተማሪዎች (Pass)', 'Passed (Pass)')}</span>
                <strong className="text-lg font-black text-emerald-950 font-mono">
                  {analyticsData.passCount}
                </strong>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-800 block font-bold">{t('የወደቁ ተማሪዎች (Fail)', 'Failed (Fail)')}</span>
                <strong className="text-lg font-black text-rose-950 font-mono">
                  {analyticsData.failCount}
                </strong>
              </div>
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>
          </div>
        </div>

        {/* Chart: Students per Program & Study Year */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-700" />
                <span>{t('በፕሮግራም የተማሪዎች ብዛት', 'Students per Program & Study Year')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('የዲፕሎማ እና የድግሪ ተማሪዎች በየዓመታቸው ያለው ዝርዝር ስርጭት', 'Enrollment breakdown of Diploma and Degree students by year level')}
              </p>
            </div>
            <span className="bg-indigo-50 text-indigo-800 font-mono text-xs font-bold px-2.5 py-1 rounded-xl border border-indigo-200">
              {students.length} {t('ተማሪዎች', 'Students')}
            </span>
          </div>

          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="ጠቅላላ_ተማሪዎች" fill="#4f46e5" radius={[6, 6, 0, 0]} name={t('ጠቅላላ ተማሪዎች', 'Total Students')} />
                <Bar dataKey="1ኛ_ዓመት" fill="#10b981" radius={[6, 6, 0, 0]} name={t('1ኛ ዓመት', '1st Year')} />
                <Bar dataKey="2ኛ_ዓመት_ተመራቂ" fill="#f59e0b" radius={[6, 6, 0, 0]} name={t('2ኛ ዓመት (ተመራቂ)', '2nd Year (Graduating)')} />
                <Bar dataKey="3ኛ_ዓመት_ተመራቂ" fill="#8b5cf6" radius={[6, 6, 0, 0]} name={t('3ኛ ዓመት (ተመራቂ)', '3rd Year (Graduating)')} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 block font-bold">{t('የዲፕሎማ ተማሪዎች', 'Diploma Students')}</span>
                <strong className="text-base font-black text-emerald-950 font-mono">
                  {students.filter((s) => s.program === 'Diploma').length}
                </strong>
              </div>
              <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-lg font-bold">
                {((students.filter((s) => s.program === 'Diploma').length / (students.length || 1)) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-indigo-800 block font-bold">{t('የድግሪ ተማሪዎች', 'Degree Students')}</span>
                <strong className="text-base font-black text-indigo-950 font-mono">
                  {students.filter((s) => s.program === 'Degree').length}
                </strong>
              </div>
              <span className="text-[10px] bg-indigo-200/60 text-indigo-900 px-2 py-0.5 rounded-lg font-bold">
                {((students.filter((s) => s.program === 'Degree').length / (students.length || 1)) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Criteria Averages Bar Chart */}
      {analyticsData.assessmentCriteriaData.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-700" />
              <span>{t('የምዘና መስፈርቶች አማካይ ውጤቶች', 'Assessment Criteria Average Performance')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('የተማሪዎች አማካይ ውጤት በክፍል 1፣ ክፍል 2፣ ሚድ፣ ፋይናል እና ተሳትፎ (ከፍተኛ ነጥብ)', 'Average student scores vs. maximum possible points across grading criteria')}
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.assessmentCriteriaData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="item" tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 700 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: any) => [`${val} ${t('ነጥብ', 'pts')}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="አማካይ_ውጤት" fill="#6366f1" radius={[6, 6, 0, 0]} name={t('የተማሪዎች አማካይ ውጤት', 'Average Student Score')} />
                <Bar dataKey="ከፍተኛ_ነጥብ" fill="#cbd5e1" radius={[6, 6, 0, 0]} name={t('የመስፈርቱ ከፍተኛ ነጥብ', 'Max Points')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Course-by-Course Performance Summary Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-700" />
              <span>{t('የኮርሶች አጠቃላይ ውጤት ማጠቃለያ ሰንጠረዥ', 'Course-by-Course Analytics Summary')}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {t('በየኮርሱ የተመዘገቡ ተማሪዎች ብዛት፣ አማካይ ውጤት፣ የማለፍ ምጣኔ እና ዋነኛ የፊደል ውጤት', 'Enrollment, evaluated count, average score, pass rate, and most frequent grade per course')}
            </p>
          </div>

          <span className="text-xs bg-purple-50 text-purple-900 border border-purple-200 font-bold px-3 py-1 rounded-xl">
            {analyticsData.courseStatsList.length} {t('ኮርሶች', 'Courses')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-xl border-b border-slate-200">
              <tr>
                <th className="p-3">{t('ኮድ / የትምህርት ኮርስ', 'Code / Course')}</th>
                <th className="p-3">{t('ፕሮግራም', 'Program')}</th>
                <th className="p-3">{t('መምህር', 'Instructor')}</th>
                <th className="p-3 text-center">{t('ተመዝጋቢ', 'Enrolled')}</th>
                <th className="p-3 text-center">{t('የተፈተኑ', 'Graded')}</th>
                <th className="p-3 text-center">{t('አማካይ ውጤት', 'Avg Score')}</th>
                <th className="p-3 text-center">{t('የማለፍ ምጣኔ', 'Pass Rate')}</th>
                <th className="p-3 text-center">{t('ዋነኛ ውጤት', 'Top Grade')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analyticsData.courseStatsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 font-bold">
                    {t('በተመረጡት ማጣሪያዎች ምንም ኮርስ አልተገኘም።', 'No courses match the selected filters.')}
                  </td>
                </tr>
              ) : (
                analyticsData.courseStatsList.map((cs) => (
                  <tr key={cs.courseId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1.5 font-mono">
                        {cs.courseCode}
                      </span>
                      {formatCourseTitle(cs.courseName, lang)}
                    </td>
                    <td className="p-3 font-semibold text-slate-600">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        cs.program === 'Diploma' ? 'bg-emerald-50 text-emerald-800' : 'bg-indigo-50 text-indigo-800'
                      }`}>
                        {formatProgram(cs.program, lang)}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">{formatTeacherDisplay(cs.instructor, lang)}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">{cs.enrolledCount}</td>
                    <td className="p-3 text-center font-mono font-bold text-purple-700">{cs.evaluatedCount}</td>
                    <td className="p-3 text-center font-mono font-extrabold text-slate-900">{cs.avgScore}%</td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold ${
                        cs.passRate >= 75
                          ? 'bg-emerald-100 text-emerald-900'
                          : cs.passRate >= 50
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}>
                        {cs.passRate}%
                      </span>
                    </td>
                    <td className="p-3 text-center font-extrabold text-indigo-900 font-mono">
                      {cs.topGrade}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

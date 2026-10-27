import React, { useState, useMemo } from 'react';
import { User, Award, Calendar, BookOpen, Clock, Printer, AlertTriangle, CheckCircle2, Bookmark, GraduationCap, Lock } from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import { calculateGradeDetails, calculateStudentGPA, getCourseAssessmentItems, getEffectiveGradeValues, getGradeKey, is2018CandidateStudent, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { GraduationTranscriptModal } from './GraduationTranscriptModal.tsx';
import { loadHistorical2018Courses } from '../data/curriculumCourses.ts';

interface StudentPortalProps {
  student: Student;
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  photoUrl?: string;
  currentYear: string;
  currentSemester: string;
  gradePublished: boolean;
  individualGradeRelease?: Record<string, boolean>;
  studentPdfPrintAllowed?: boolean;
  individualPdfPrintAllowed?: Record<string, boolean>;
  fullTranscriptPublished?: boolean;
  individualFullTranscriptRelease?: Record<string, boolean>;
  officialConfig?: OfficialSignaturesConfig;
  churchLogo?: string;
  onOpenTranscript: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  student,
  courses,
  grades,
  photoUrl,
  currentYear,
  currentSemester,
  gradePublished,
  individualGradeRelease,
  studentPdfPrintAllowed = false,
  individualPdfPrintAllowed,
  fullTranscriptPublished = false,
  individualFullTranscriptRelease,
  officialConfig,
  churchLogo,
  onOpenTranscript
}) => {
  const [showGraduationTranscript, setShowGraduationTranscript] = useState(false);

  // Check if grade/transcript release is authorized for this specific student
  const isStudentReleased = (
    individualGradeRelease && individualGradeRelease[student.uid] !== undefined
      ? individualGradeRelease[student.uid]
      : gradePublished
  ) === true;

  // Helper to identify 2018 Diploma Entrants (the 10 Diploma students admitted in 2018)
  const is2018DiplomaEntrant =
    student.program === 'Diploma' &&
    (student.admissionYear === '2018' || (student.id && student.id.startsWith('2018')));

  const isGraduatingCandidate = is2018CandidateStudent(student);

  // Active Year and Semester selected by student
  const [activeYear, setActiveYear] = useState<string>(currentYear || '2019');
  const [activeSem, setActiveSem] = useState<string>(currentSemester || '1');

  // Available tabs for this student
  const availableTabs = useMemo(() => {
    const tabs: Array<{ year: string; sem: string; label: string }> = [];

    if (is2018DiplomaEntrant) {
      tabs.push({ year: '2018', sem: '1', label: '2018 ዓ/ም (1ኛ ሴሚስተር)' });
      tabs.push({ year: '2018', sem: '2', label: '2018 ዓ/ም (2ኛ ሴሚስተር)' });
      tabs.push({ year: '2019', sem: '1', label: '2019 ዓ/ም (1ኛ ሴሚስተር)' });
      if (currentSemester === '2') {
        tabs.push({ year: '2019', sem: '2', label: '2019 ዓ/ም (2ኛ ሴሚስተር)' });
      }
    } else {
      // Non-2018 Diploma entrants (1st year Diploma & ALL Degree students)
      tabs.push({ year: '2019', sem: '1', label: '2019 ዓ/ም (1ኛ ሴሚስተር)' });
      if (currentSemester === '2') {
        tabs.push({ year: '2019', sem: '2', label: '2019 ዓ/ም (2ኛ ሴሚስተር)' });
      }
    }
    return tabs;
  }, [is2018DiplomaEntrant, currentSemester]);

  // Combine active courses with historical 2018 courses for 2018 Diploma entrants
  const studentCourses = useMemo(() => {
    if (activeYear === '2018') {
      const historical = loadHistorical2018Courses();
      return historical.filter((c) => c.program === 'Diploma' && (c.semester === activeSem || !c.semester));
    }

    return courses.filter((c) => {
      if (c.program !== student.program) return false;
      if (c.academicYear === '2018' || c.id.startsWith('dip_sem1') || c.id.startsWith('dip_sem2') || c.id.startsWith('deg_p')) {
        return false;
      }
      if (c.semester && c.semester !== activeSem) {
        return false;
      }
      return true;
    });
  }, [courses, student.program, activeYear, activeSem]);

  const gpa = calculateStudentGPA(student, activeYear === '2018' ? loadHistorical2018Courses() : courses, grades, activeYear, activeSem);

  // Check if Full Graduation Transcript is explicitly permitted for this student
  const isFullTranscriptAllowed = (
    isGraduatingCandidate &&
    isStudentReleased &&
    (
      individualFullTranscriptRelease && individualFullTranscriptRelease[student.uid] !== undefined
        ? individualFullTranscriptRelease[student.uid]
        : (fullTranscriptPublished ?? false)
    )
  ) === true;

  // Check if PDF print is allowed for this student
  const isPdfPrintAllowed = (
    individualPdfPrintAllowed && individualPdfPrintAllowed[student.uid] !== undefined
      ? individualPdfPrintAllowed[student.uid]
      : studentPdfPrintAllowed
  ) === true;

  return (
    <div className="space-y-6 no-print">
      {/* Student Profile & GPA Hero Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md bg-emerald-800 flex-shrink-0 flex items-center justify-center text-white text-2xl font-bold">
            {photoUrl ? (
              <img src={photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <span>{student.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{student.name}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  student.program === 'Degree'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {student.program === 'Degree' ? 'የድግሪ ፕሮግራም' : 'የዲፕሎማ ፕሮግራም'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                student.currentStudyYear === 2 ? 'bg-amber-100 text-amber-950 border border-amber-300' : student.currentStudyYear === 3 ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-700'
              }`}>
                {student.currentStudyYear ? `${student.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                student.graduationStatus === 'GRADUATED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : student.graduationStatus === 'CANDIDATE'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {student.graduationStatus === 'GRADUATED' ? '🎓 የተመረቀ' : student.graduationStatus === 'CANDIDATE' ? '⭐ ተማራቂ' : '📚 በመማር ላይ'}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 flex flex-wrap items-center gap-2">
              <span>መለያ ኮድ: <strong className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{student.id}</strong></span>
              <span>| ጾታ: <strong>{student.gender}</strong></span>
              <span>| መንገድ: <strong>{student.program === 'Diploma' ? '2 ዓመት (4 ሴሚስተር)' : student.degreeTrack === '2_YEAR' || student.priorDiploma ? 'የ2 ዓመት ድግሪ (ቀድሞ ዲፕሎማ)' : 'መደበኛ 3 ዓመት ድግሪ'}</strong></span>
            </p>
            <p className="text-[11px] text-emerald-800 font-bold mt-1">
              🇪🇹 የሚመለከቱት፦ {activeYear} ዓ.ም ({activeSem}ኛ ሴሚስተር)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Transcript buttons are COMPLETELY HIDDEN from students unless grade release is officially authorized for THIS student */}
          {isStudentReleased && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenTranscript}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                title="የሴሚስተር ትራንስክሪፕት ይመልከቱ"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>የ{activeYear} ዓ.ም ሴሚስተር ትራንስክሪፕት</span>
              </button>

              {/* ሙሉ የምረቃ ትራንስክሪፕት button is STRICTLY HIDDEN from students unless explicitly permitted */}
              {isFullTranscriptAllowed && (
                <button
                  onClick={() => setShowGraduationTranscript(true)}
                  className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                  title="የተማሩበትን ሙሉ ትምህርት የምረቃ ትራንስክሪፕት በአንድ ላይ ይመልከቱ"
                >
                  <GraduationCap className="w-4 h-4 text-amber-300" />
                  <span>ሙሉ የምረቃ ትራንስክሪፕት</span>
                </button>
              )}

              {!isPdfPrintAllowed && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>የፒዲኤፍ ማተም ታግዷል (ማየት ብቻ)</span>
                </span>
              )}
            </div>
          )}

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/70 border border-amber-300 rounded-2xl p-3 text-center min-w-[120px] shadow-xs">
            <span className="block text-[10px] uppercase font-bold text-amber-800 tracking-wider">
              የሴሚስተሩ GPA ({activeYear}/{activeSem})
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">
              {isStudentReleased ? gpa : '🔒 ***'}
            </span>
          </div>
        </div>
      </div>

      {/* Grade status alert when pending official authorization */}
      {!isStudentReleased && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-950 p-4 rounded-2xl text-xs flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-sm text-rose-900 flex items-center gap-1.5">
              <span>🔒 የእርሶ ውጤትና ትራንስክሪፕት ለጊዜው አልተለቀቀም / ታግዷል</span>
              <span className="bg-rose-200 text-rose-950 px-2 py-0.5 rounded text-[10px] font-mono">RELEASE HELD</span>
            </p>
            <p className="text-rose-800 font-medium">
              የዚህ ሴሚስተር ውጤትና የትራንስክሪፕት ሰነዶች በኃላፊነት ባላቸው አካላት (በዋና አድሚን፣ በዋና ዲን እና በሪጅስተራል) ተረጋግጠው በይፋ እስኪፈቀዱ ድረስ ተሰውረዋል። እባክዎን በጽሕፈት ቤት በኩል ይፋ እስኪደረግ ይታገሱ።
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Grade Results & Weekly Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semester Grades */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-700" />
              <span>የሴሚስተሩ የትምህርት ውጤት (Grade Report)</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">{studentCourses.length} ኮርሶች</span>
          </div>

          {/* Interactive Semester Selection Tabs */}
          {availableTabs.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 px-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>ሴሚስተር ይምረጡ፦</span>
              </span>
              {availableTabs.map((tab) => {
                const isActive = activeYear === tab.year && activeSem === tab.sem;
                return (
                  <button
                    key={tab.year + '_' + tab.sem}
                    type="button"
                    onClick={() => {
                      setActiveYear(tab.year);
                      setActiveSem(tab.sem);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-600'
                        : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                <tr>
                  <th className="p-3">ተ.ቁ</th>
                  <th className="p-3">የኮርስ ስም</th>
                  <th className="p-3">ቀን / ሰሌዳ</th>
                  <th className="p-3">የተመደበ መምህር</th>
                  <th className="p-3 text-center">ውጤት</th>
                  <th className="p-3 text-center">ፊደል ደረጃ</th>
                  <th className="p-3 text-center">ትርጉም</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentCourses.map((c, idx) => {
                  const g = resolveGradeBreakdown(grades, student.uid, c.id, activeYear, activeSem, student.id);
                  const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3 text-amber-900 font-medium bg-amber-50/50 rounded">{c.schedule}</td>
                      <td className="p-3 text-slate-600 font-semibold">{c.teacher}</td>
                      <td className="p-3 text-center font-black font-mono">
                        {!isStudentReleased ? '***' : eff.hasAny ? eff.total : '—'}
                      </td>
                      <td className="p-3 text-center font-black text-emerald-800 text-sm">
                        {!isStudentReleased ? '***' : eff.letter}
                      </td>
                      <td className="p-3 text-center text-[10px] text-slate-500 font-medium">
                        {!isStudentReleased ? '***' : eff.desc}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timetable / Schedule */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>የኮርሶች የቀን ሰሌዳ (Course Schedule)</span>
            </h3>

            <div className="space-y-3">
              {studentCourses.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-emerald-300 transition-colors"
                >
                  <p className="font-bold text-xs text-slate-800">{c.name}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-semibold mt-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>{c.schedule || 'አልተወሰነም'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">መምህር: {c.teacher}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Student Spiritual Guidance & Academic Motto */}
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-sm border border-emerald-800 space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Award className="w-4 h-4 text-amber-400" />
              <span>የተማሪዎች መንፈሳዊ መመሪያ</span>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed font-sans">
              በትምህርት ወቅት በትጋት፣ በጸሎትና በአክብሮት በመገኘት የቤተ ክርስቲያንን አደራ በታማኝነት መወጣት ይገባል።
            </p>
            <p className="text-[11px] text-amber-300/90 font-medium pt-1">
              የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት
            </p>
          </div>
        </div>
      </div>

      {/* Complete Consolidated Graduation Transcript Modal */}
      {showGraduationTranscript && (
        <GraduationTranscriptModal
          student={student}
          allCourses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          allowPdfPrint={isPdfPrintAllowed}
          isStudentViewer={true}
          onClose={() => setShowGraduationTranscript(false)}
        />
      )}
    </div>
  );
};

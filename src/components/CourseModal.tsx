import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { Course, ProgramType } from '../types.ts';

interface CourseModalProps {
  course: Course | null;
  teachers: string[];
  onClose: () => void;
  onSave: (courseData: Omit<Course, 'id'> & { id?: string }) => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  course,
  teachers,
  onClose,
  onSave
}) => {
  const [program, setProgram] = useState<ProgramType>(course ? course.program : 'Degree');
  const [name, setName] = useState(course ? course.name : '');
  const [code, setCode] = useState(course?.code || '');
  const [teacher, setTeacher] = useState(course ? (course.teacher || 'አልተመደበም (—)') : 'አልተመደበም (—)');
  const [schedule, setSchedule] = useState(course ? course.schedule : '');
  const [credits, setCredits] = useState<number>(course ? course.credits : 3);
  const [academicYear, setAcademicYear] = useState(course?.academicYear || '2019');
  const [semester, setSemester] = useState(course?.semester || '1');

  // Ensure 'አልተመደበም (—)' is in the list
  const normalizedTeachers = React.useMemo(() => {
    const set = new Set<string>();
    set.add('አልተመደበም (—)');
    teachers.forEach((t) => {
      if (t && t.trim()) set.add(t);
    });
    return Array.from(set);
  }, [teachers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: course ? course.id : undefined,
      program,
      name: name.trim(),
      code: code.trim() || undefined,
      teacher: teacher || 'አልተመደበም (—)',
      schedule: schedule.trim() || 'አልተወሰነም',
      credits: Number(credits) || 3,
      academicYear: academicYear.trim() || undefined,
      semester: semester || undefined,
      assessmentConfig: course?.assessmentConfig,
      remarks: course?.remarks
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-emerald-950 text-white p-4.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">
              {course ? 'የኮርስ መረጃ ማስተካከያ' : 'አዲስ ኮርስ መጨመሪያ'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">የትምህርት ፕሮግራም</label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value as ProgramType)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-semibold focus:ring-2 focus:ring-emerald-700 cursor-pointer"
              >
                <option value="Degree">ድግሪ (Degree Program)</option>
                <option value="Diploma">ዲፕሎማ (Diploma Program)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">የኮርስ ኮድ (አማራጭ)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ምሳሌ: BTH-101 / DIP-101"
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">የኮርስ ስም</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ምሳሌ: ሥነ-አፈታት (Hermeneutics)"
              required
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">የተመደበ መምህር</label>
            <select
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-medium focus:ring-2 focus:ring-emerald-700 cursor-pointer"
            >
              {normalizedTeachers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">የትምህርት ቀን / ሰዓት</label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="ምሳሌ: ሰኞ 2:00 - 4:00"
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">ክሬዲት ሰዓት (Credits)</label>
              <input
                type="number"
                min="1"
                max="6"
                value={credits}
                onChange={(e) => setCredits(parseInt(e.target.value) || 3)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">የትምህርት ዘመን (ዓ.ም)</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="ምሳሌ: 2019"
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">ሴሚስተር</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-medium focus:ring-2 focus:ring-emerald-700 cursor-pointer"
              >
                <option value="1">1ኛ ሴሚስተር</option>
                <option value="2">2ኛ ሴሚስተር</option>
                <option value="ALL">ሁለቱም / ሁሉም</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
            >
              ሰርዝ
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
            >
              አስቀምጥ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


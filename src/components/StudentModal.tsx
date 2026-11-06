import React, { useState, useEffect } from 'react';
import { UserPlus, Edit3, X } from 'lucide-react';
import { ProgramType, Student } from '../types.ts';

interface StudentModalProps {
  existingUids: string[];
  studentToEdit?: Student | null;
  onClose: () => void;
  onSave: (student: Student) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  existingUids,
  studentToEdit,
  onClose,
  onSave,
  showNotify
}) => {
  const isEdit = !!studentToEdit;

  const [id, setId] = useState(studentToEdit?.id || '');
  const [name, setName] = useState(studentToEdit?.name || '');
  const [gender, setGender] = useState<'ወንድ' | 'ሴት'>(studentToEdit?.gender || 'ወንድ');
  const [program, setProgram] = useState<ProgramType>(studentToEdit?.program || 'Degree');
  const [admissionYear, setAdmissionYear] = useState(studentToEdit?.admissionYear || '2019');
  const [currentStudyYear, setCurrentStudyYear] = useState<number>(studentToEdit?.currentStudyYear || 1);
  const [degreeTrack, setDegreeTrack] = useState<'2_YEAR' | '3_YEAR'>(studentToEdit?.degreeTrack || '3_YEAR');
  const [priorDiploma, setPriorDiploma] = useState(studentToEdit?.priorDiploma || false);
  const [graduationStatus, setGraduationStatus] = useState<'ACTIVE' | 'CANDIDATE' | 'GRADUATED'>(studentToEdit?.graduationStatus || 'ACTIVE');

  useEffect(() => {
    if (studentToEdit) {
      setId(studentToEdit.id || '');
      setName(studentToEdit.name || '');
      setGender(studentToEdit.gender || 'ወንድ');
      setProgram(studentToEdit.program || 'Degree');
      setAdmissionYear(studentToEdit.admissionYear || '2019');
      setCurrentStudyYear(studentToEdit.currentStudyYear || 1);
      setDegreeTrack(studentToEdit.degreeTrack || '3_YEAR');
      setPriorDiploma(studentToEdit.priorDiploma || false);
      setGraduationStatus(studentToEdit.graduationStatus || 'ACTIVE');
    }
  }, [studentToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = id.trim();
    const cleanName = name.trim();

    if (!cleanId || !cleanName) {
      showNotify('እባክዎ ሙሉ መረጃዎችን ያስገቡ!', 'error');
      return;
    }

    const targetUid = isEdit ? studentToEdit.uid : `${program === 'Degree' ? 'deg' : 'dip'}_${cleanId}`;

    if (!isEdit && existingUids.includes(targetUid)) {
      showNotify(`ይህ የተማሪ መለያ ቁጥር (${cleanId}) በ${program} ፕሮግራም አስቀድሞ ተመዝግቧል!`, 'error');
      return;
    }

    onSave({
      ...(studentToEdit || {}),
      uid: targetUid,
      id: cleanId,
      name: cleanName,
      gender,
      program,
      admissionYear,
      currentStudyYear,
      degreeTrack: program === 'Degree' ? degreeTrack : undefined,
      priorDiploma: program === 'Degree' ? priorDiploma : false,
      graduationStatus
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 no-print overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col my-auto">
        <div className="bg-emerald-950 text-white p-4.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            {isEdit ? <Edit3 className="w-4.5 h-4.5 text-amber-400" /> : <UserPlus className="w-4.5 h-4.5 text-amber-400" />}
            <h3 className="font-bold text-sm">
              {isEdit ? `የተማሪ መረጃ ማስተካከያ - ${studentToEdit.name}` : 'አዲስ ተማሪ መመዝገቢያ (Register Student)'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1">
          <div>
            <label className="block font-bold text-slate-700 mb-1">የትምህርት ፕሮግራም</label>
            <select
              value={program}
              onChange={(e) => {
                const p = e.target.value as ProgramType;
                setProgram(p);
                if (p === 'Diploma') {
                  setDegreeTrack('2_YEAR');
                  setPriorDiploma(false);
                }
              }}
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-semibold focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Degree">ድግሪ (Degree Program)</option>
              <option value="Diploma">ዲፕሎማ (Diploma Program - 2 ዓመት / 4 ሴሚስተር)</option>
            </select>
          </div>

          {/* Degree Track Options */}
          {program === 'Degree' && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <label className="block font-bold text-indigo-950">የድግሪ ትምህርት ዝግጅት / መንገድ፦</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="radio"
                    name="degreeTrack"
                    checked={degreeTrack === '2_YEAR'}
                    onChange={() => {
                      setDegreeTrack('2_YEAR');
                      setPriorDiploma(true);
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>የ2 ዓመት ድግሪ (ቀድሞ የመጽሐፍ ቅዱስ ዲፕሎማ ያላቸው - 4 ሴሚስተር)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="radio"
                    name="degreeTrack"
                    checked={degreeTrack === '3_YEAR'}
                    onChange={() => {
                      setDegreeTrack('3_YEAR');
                      setPriorDiploma(false);
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>መደበኛ የ3 ዓመት ድግሪ (5 ወይም 6 ሴሚስተር)</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">የመለያ ኮድ (Student ID No)</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="ምሳሌ: 201936"
              required
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">የተማሪው ሙሉ ስም (Student Full Name)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="የተማሪውን ሙሉ ስም የአባት ስም ጨምሮ ይጻፉ..."
              required
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-medium text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ጾታ</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-semibold focus:ring-2 focus:ring-emerald-700"
              >
                <option value="ወንድ">ወንድ</option>
                <option value="ሴት">ሴት</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">የትምህርት ደረጃ</label>
              <select
                value={currentStudyYear}
                onChange={(e) => setCurrentStudyYear(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-semibold focus:ring-2 focus:ring-emerald-700"
              >
                <option value={1}>1ኛ ዓመት (Year 1)</option>
                <option value={2}>2ኛ ዓመት (Year 2)</option>
                {program === 'Degree' && <option value={3}>3ኛ ዓመት (Year 3)</option>}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">የገቡበት ዓ.ም (ኢ.ዘ.አ)</label>
              <input
                type="text"
                value={admissionYear}
                onChange={(e) => setAdmissionYear(e.target.value)}
                placeholder="ምሳሌ: 2018 ወይም 2019"
                required
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">የተማሪነት ሁኔታ</label>
              <select
                value={graduationStatus}
                onChange={(e) => setGraduationStatus(e.target.value as any)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-semibold focus:ring-2 focus:ring-emerald-700"
              >
                <option value="ACTIVE">በመማር ላይ (Active)</option>
                <option value="CANDIDATE">ተማራቂ (Graduation Candidate)</option>
                <option value="GRADUATED">የተመረቀ (Graduated)</option>
              </select>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex justify-end gap-2 shrink-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
            >
              ሰርዝ
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>{isEdit ? 'ለውጦችን አስቀምጥ' : 'መዝግብ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

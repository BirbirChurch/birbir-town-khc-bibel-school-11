import React from 'react';
import { CheckCircle2, Lock, Unlock, ShieldAlert, Award, Globe, EyeOff } from 'lucide-react';
import { SemesterReleaseConfig } from '../types.ts';
import { useLanguage } from '../utils/i18n.tsx';

interface SemesterReleaseControlProps {
  semesterRelease: SemesterReleaseConfig;
  onToggleSemesterRelease: (key: string, value?: boolean) => void;
  onToggleAllSemestersRelease: (value: boolean) => void;
  userRole?: 'DEAN' | 'ADMIN';
}

export const SemesterReleaseControl: React.FC<SemesterReleaseControlProps> = ({
  semesterRelease,
  onToggleSemesterRelease,
  onToggleAllSemestersRelease,
  userRole = 'DEAN'
}) => {
  const { t } = useLanguage();

  const semestersList = [
    {
      key: '2018_1',
      label: t('2018 ዓ.ም 1ኛ ሴሚስተር', '2018 E.C. 1st Semester'),
      desc: t('የተመራቂዎች 1ኛ ዓመት - 1ኛ ሴሚስተር ውጤት', 'Graduates Year 1 — 1st Semester grades')
    },
    {
      key: '2018_2',
      label: t('2018 ዓ.ም 2ኛ ሴሚስተር', '2018 E.C. 2nd Semester'),
      desc: t('የተመራቂዎች 1ኛ ዓመት - 2ኛ ሴሚስተር ውጤት', 'Graduates Year 1 — 2nd Semester grades')
    },
    {
      key: '2019_1',
      label: t('2019 ዓ.ም 1ኛ ሴሚስተር', '2019 E.C. 1st Semester'),
      desc: t('የሁሉም ተማሪዎች (ድግሪና ዲፕሎማ) 1ኛ ሴሚስተር ውጤት', 'All students (Degree & Diploma) 1st Semester grades')
    },
    {
      key: '2019_2',
      label: t('2019 ዓ.ም 2ኛ ሴሚስተር', '2019 E.C. 2nd Semester'),
      desc: t('የ2ኛ ሴሚስተር ውጤት (ዲን/አድሚን ሲፈቅድ የሚከፈት)', '2nd Semester grades (opened upon Dean/Admin release)')
    },
    {
      key: 'cumulative',
      label: t('የአራቱ ሰሚስተር ጥምር ውጤት', '4-Semester Cumulative'),
      desc: t('የተመራቂዎች ሙሉ 4-ሴሚስተር ትራንስክሪፕት ሰነድ', 'Complete 4-Semester Graduation Transcript view')
    }
  ];

  const isAllReleased = Boolean(semesterRelease.all) || (
    semesterRelease['2018_1'] &&
    semesterRelease['2018_2'] &&
    semesterRelease['2019_1'] &&
    semesterRelease['2019_2'] &&
    semesterRelease.cumulative
  );

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-900/80 space-y-5">
      {/* Header and Master Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-indigo-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-inner flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
              <span>{t('የሰሚስተሮች ውጤት ማጽደቂያና በተማሪዎች ገጽ መልቀቂያ', 'Semester Grade Approval & Student Portal Release')}</span>
              <span className="text-[10px] bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-black uppercase">
                {userRole === 'ADMIN' ? t('አድሚን ስልጣን', 'Admin Authority') : t('ዋና ዲን ስልጣን', 'Dean Authority')}
              </span>
            </h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              {t(
                'በተማሪዎች ማሳያ ገጽ ላይ የትኞቹ ሰሚስተሮች እንዲታዩ ወይም እንዲታገዱ የመወሰንና የመቆጣጠር ስልጣን',
                'Control which semesters are visible or held on the Student Portal'
              )}
            </p>
          </div>
        </div>

        {/* Master Batch Actions */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            type="button"
            onClick={() => onToggleAllSemestersRelease(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
            title={t('ሁሉንም ሰሚስተሮች በአንድ ላይ ለተማሪዎች ፍቀድ', 'Release all semesters together to students')}
          >
            <Globe className="w-4 h-4 text-emerald-200" />
            <span>{t('ሁሉንም ፍቀድ (Release All)', 'Release All')}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleAllSemestersRelease(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-rose-700 hover:bg-rose-600 text-white shadow-sm transition-all cursor-pointer"
            title={t('ሁሉንም ሰሚስተሮች እንዳይታዩ አግድ', 'Hold all semesters from student view')}
          >
            <EyeOff className="w-4 h-4 text-rose-200" />
            <span>{t('ሁሉንም እገድ (Hold All)', 'Hold All')}</span>
          </button>
        </div>
      </div>

      {/* Grid of Individual Semester Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {semestersList.map((item) => {
          const isReleased = semesterRelease.all ? true : Boolean(semesterRelease[item.key]);

          return (
            <div
              key={item.key}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                isReleased
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-xs'
                  : 'bg-slate-800/60 border-slate-700/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-black text-amber-300 truncate">{item.label}</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isReleased
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                    }`}
                  >
                    {isReleased ? <Unlock className="w-3 h-3 text-emerald-300" /> : <Lock className="w-3 h-3 text-rose-300" />}
                    <span>{isReleased ? t('ተፈቅዷል', 'Released') : t('ታግዷል', 'Held')}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug line-clamp-2">
                  {item.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onToggleSemesterRelease(item.key)}
                className={`w-full py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                  isReleased
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isReleased ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t('ውጤቱን እገድ (Hold)', 'Hold Results')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('ውጤቱን ፍቀድ (Release)', 'Release Results')}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

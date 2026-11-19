import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, ProgramType, GraduationStatus, DegreeTrackType } from '../types.ts';
import type { DailyVerse } from '../data/dailyVerses.ts';

export type AppLanguage = 'am' | 'en';

const STORAGE_KEY = 'bk_language';

export function getCurrentLanguage(): AppLanguage {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'am') return saved;
    } catch (_) {}
  }
  return 'am';
}

export function tr(am: string, en: string, lang: AppLanguage = getCurrentLanguage()): string {
  return lang === 'en' ? en : am;
}

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  toggleLang: () => void;
  isEn: boolean;
  t: (am: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'am',
  setLang: () => {},
  toggleLang: () => {},
  isEn: false,
  t: (am: string) => am
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLanguage>(() => getCurrentLanguage());

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (_) {}
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'am' ? 'en' : 'am');
  }, [lang, setLang]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'en' ? 'en' : 'am';
      document.title =
        lang === 'en'
          ? 'Birbir City KHC Bible Training School — Academic & Grade Management'
          : 'ብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን — የመጽሐፍ ቅዱስ ማሰልጠኛ ት/ቤት';
    }
  }, [lang]);

  const t = useCallback((am: string, en: string) => (lang === 'en' ? en : am), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, isEn: lang === 'en', t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

// --- Semantic Domain Formatters (Keep stored values intact, translate at UI/export layer) ---

export function formatRole(role: UserRole | string, lang: AppLanguage = getCurrentLanguage()): string {
  if (lang !== 'en') {
    const amMap: Record<string, string> = {
      ADMIN: 'ዋና አድሚን',
      DEAN: 'ዋና ዲን',
      REGISTRAR: 'ሪጅስተራል',
      TEACHER: 'መምህር',
      STUDENT: 'ተማሪ'
    };
    return amMap[role] || role;
  }
  const enMap: Record<string, string> = {
    ADMIN: 'Super Admin',
    DEAN: 'Academic Dean',
    REGISTRAR: 'Registrar',
    TEACHER: 'Instructor',
    STUDENT: 'Student'
  };
  return enMap[role] || role;
}

export function formatProgram(program: ProgramType | string | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  if (!program) return '';
  if (lang === 'en') {
    if (program === 'Degree') return 'Degree';
    if (program === 'Diploma') return 'Diploma';
    return program;
  }
  if (program === 'Degree') return 'ድግሪ';
  if (program === 'Diploma') return 'ዲፕሎማ';
  return program;
}

export function formatGender(gender: string | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  if (!gender) return '';
  if (lang === 'en') {
    if (gender === 'ወንድ' || gender === 'Male' || gender === 'M') return 'Male';
    if (gender === 'ሴት' || gender === 'Female' || gender === 'F') return 'Female';
  }
  return gender;
}

export function formatSemester(sem: string | number | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  const s = String(sem || '1');
  if (lang === 'en') {
    if (s === '1') return '1st Semester';
    if (s === '2') return '2nd Semester';
    if (s === '3') return '3rd Semester';
    if (s === '4') return '4th Semester';
    if (s === '5') return '5th Semester';
    if (s === '6') return '6th Semester';
    return `Semester ${s}`;
  }
  return `${s}ኛ ሴሚስተር`;
}

export function formatYearLevel(yearNum: number | string | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  const y = Number(yearNum || 1);
  if (lang === 'en') {
    if (y === 1) return '1st Year';
    if (y === 2) return '2nd Year';
    if (y === 3) return '3rd Year';
    return `Year ${y}`;
  }
  return `${y}ኛ ዓመት`;
}

export function formatCalendarYear(yearStr: string | number | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  const y = String(yearStr || '2019').trim();
  return lang === 'en' ? `${y} E.C.` : `${y} ዓ.ም`;
}

export function formatGradeDesc(desc: string | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  if (!desc) return lang === 'en' ? 'Not Entered' : 'አልተሞላም';
  if (lang !== 'en') return desc;
  const map: Record<string, string> = {
    'እጅግ በጣም ጥሩ': 'Excellent',
    'በጣም ጥሩ': 'Very Good',
    'ጥሩ': 'Good',
    'ደህና': 'Fairly Good',
    'አጥጋቢ': 'Satisfactory',
    'አልፏል': 'Pass',
    'ዝቅተኛ ማለፊያ': 'Low Pass',
    'ዝቅተኛ': 'Poor',
    'ዝቅተኛ / ማለፊያ': 'Marginal Pass',
    'ወድቋል': 'Failed',
    'አልተሞላም': 'Not Entered',
    'አልተመዘገበም': 'Not Recorded'
  };
  return map[desc.trim()] || desc;
}

export function formatCriterionLabel(label: string | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  if (!label) return '';
  if (lang !== 'en') return label;
  const map: Record<string, string> = {
    'ክፍል 1': 'Part 1',
    'ክፍል 2': 'Part 2',
    'ሚድ': 'Midterm',
    'ሚድ ፈተና': 'Midterm Exam',
    'ፋይናል': 'Final',
    'ፋይናል ፈተና': 'Final Exam',
    'ተሳትፎ': 'Attendance',
    'ክፍል ተሳትፎ': 'Participation',
    'አሳይመንት': 'Assignment',
    'ፕሮጀክት': 'Project',
    'ኩዊዝ': 'Quiz',
    'ፈተና': 'Exam'
  };
  return map[label.trim()] || label;
}

export function formatGradStatus(status: GraduationStatus | string | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  if (lang !== 'en') {
    if (status === 'GRADUATED') return 'የተመረቀ';
    if (status === 'CANDIDATE') return 'ተማራቂ';
    return 'በመማር ላይ';
  }
  if (status === 'GRADUATED') return 'Graduated';
  if (status === 'CANDIDATE') return 'Graduating Candidate';
  return 'Active Student';
}

export function formatDegreeTrack(
  track: DegreeTrackType | string | undefined,
  priorDiploma: boolean | undefined,
  lang: AppLanguage = getCurrentLanguage()
): string {
  const isTwoYear = track === '2_YEAR' || priorDiploma;
  if (lang === 'en') {
    return isTwoYear ? '2-Year Track (Prior Bible Diploma)' : '3-Year Regular Degree Track';
  }
  return isTwoYear ? 'የ2 ዓመት ድግሪ (ቀድሞ ዲፕሎማ ያላቸው)' : 'መደበኛ የ3 ዓመት ድግሪ';
}

export function formatTeacherDisplay(teacher: string | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  if (!teacher || teacher.trim() === '' || teacher.includes('አልተመደበም')) {
    return lang === 'en' ? 'Unassigned (—)' : 'አልተመደበም (—)';
  }
  return teacher;
}

const COURSE_EN_MAP: Record<string, string> = {
  'ሥነ-አፈታት': 'Biblical Hermeneutics',
  'ሥነ-አፈታት (Hermeneutics)': 'Biblical Hermeneutics',
  'እግዚአብሔርና መጽሐፍ ቅዱስ': 'God and the Bible',
  'አጠናን ዘዴ': 'Biblical Study Methods',
  'ብሉይ ኪዳን 1': 'Old Testament Survey I',
  'አዲስ ኪዳን 1': 'New Testament Survey I',
  'አማርኛ ሰዋሰው': 'Amharic Grammar & Composition',
  'ፍልስፍናና ሥነ-መለኮት': 'Philosophy and Theology',
  'የአዲስ ኪዳን ሥነ-መለኮት': 'New Testament Theology',
  'ሥነ-ምግባር': 'Christian Ethics',
  'መንፈስ ቅዱስና መናፍስት': 'Pneumatology & Spiritual Realm',
  'ክርስቶስና ደህንነት': 'Christology and Salvation',
  'ቤተክርስቲያንና የመጨረሻው ዘመን': 'Church & Eschatology',
  'ተግባቦት': 'Christian Communication',
  'የቃ/ሕ/ቤ/ክ ታሪክ': 'History of Kale Heywet Church',
  'የጋብቻ ትምህርት': 'Christian Marriage Studies',
  'ክርስቶስ መሰል መሪነት': 'Christ-like Leadership',
  'የቤተ ክርስቲያን ታርክ ጥንቱና መካከለኛው': 'Early & Medieval Church History',
  'የሐሰት ትምህርት ማስጠንቀቂያ': 'Warning Against False Teachings',
  'የመጋቢነት አገልግሎት': 'Pastoral Ministry',
  'ክርስቲያናዊ ትምህርት': 'Christian Education',
  'የስብኬት ዘዴ': 'Homiletics (Preaching Methods)',
  'የዮሐንስ ራዕይ': 'Book of Revelation',
  '1ኛ እና 2ኛ ቆሮንቶስ መለዕክት': '1 & 2 Corinthians',
  'የክርስትና ትምህርት መሠረታዊ እውነቶች': 'Foundations of Christian Doctrine',
  'የነቢያት መጻሕፍት ጥናት (Prophetic Books)': 'Prophetic Books Studies',
  'የሮሜ መልእክት ሥነ-መለኮት': 'Theology of Romans',
  'የመጋቢነት አገልግሎትና አመራር': 'Pastoral Ministry & Leadership',
  'የክርስቲያን ጋብቻና ቤተሰብ ምክክር': 'Christian Marriage & Family Counseling',
  'የቤተ ክርስቲያን ተከላና እድገት': 'Church Planting & Growth',
  'የአምልኮና ዝማሬ አገልግሎት መመሪያ': 'Worship & Music Ministry',
  'የመጨረሻው ዘመን ትምህርት (Eschatology)': 'Eschatology',
  'የተግባር አገልግሎት ልምምድ (Practical Ministry)': 'Practical Ministry Practicum',
  'የሐሰት ትምህርቶችና የኑፋቄ መከላከያ (Apologetics)': 'Christian Apologetics',
  'የሕፃናትና ወጣቶች አገልግሎት': 'Children & Youth Ministry',
  'የምረቃ የምርምር ጽሑፍ (Graduation Project)': 'Graduation Research Project',
  'የላቀ ሥነ-አፈታት (Advanced Hermeneutics)': 'Advanced Hermeneutics',
  'እግዚአብሔርና መጽሐፍ ቅዱስ ሥነ-መለኮት': 'Theology of God & Scripture',
  'የሥነ-መለኮት ምርምርና አጠናን ዘዴ': 'Theological Research & Study Methods',
  'ብሉይ ኪዳን ሥነ-መለኮት 1 (ኦሪትና ታሪክ)': 'Old Testament Theology I (Torah & History)',
  'አዲስ ኪዳን ሥነ-መለኮት 1 (ወንጌላት)': 'New Testament Theology I (Gospels)',
  'የግሪክ ቋንቋ መሠረታዊ ጥናት 1': 'Biblical Greek I',
  'ፍልስፍናና ክርስቲያናዊ አስተሳሰብ': 'Philosophy & Christian Thought',
  'የግሪክ ቋንቋ መሠረታዊ ጥናት 2': 'Biblical Greek II',
  'ብሉይ ኪዳን ሥነ-መለኮት 2 (የጥበብና የትንቢት መጻሕፍት)': 'Old Testament Theology II (Wisdom & Prophets)',
  'አዲስ ኪዳን ሥነ-መለኮት 2 (የጳውሎስ መልእክታት)': 'New Testament Theology II (Pauline Epistles)',
  'ሥርዓተ-ትምህርትና የመጽሐፍ ቅዱስ ትምህርት አመራር': 'Curriculum & Bible Education Leadership',
  'ዓለም አቀፍ የሚሲዮን ታሪክና ስትራቴጂ': 'Global Missions History & Strategy',
  'የስልታዊ ሥነ-መለኮት ጥናት 1 (Systematic Theology I)': 'Systematic Theology I',
  'የዕብራይስጥ ቋንቋ መሠረታዊ ጥናት 1': 'Biblical Hebrew I',
  'የላቀ የስብከትና የማስተማር ሥነ-ዘዴ (Homiletics II)': 'Advanced Homiletics (Homiletics II)',
  'የቤተ ክርስቲያን አስተዳደርና ድርጅታዊ አመራር': 'Church Administration & Organizational Leadership',
  'የክርስቲያን ሥነ-ልቦናዊ ምክክር (Pastoral Counseling)': 'Pastoral Counseling',
  'የስልታዊ ሥነ-መለኮት ጥናት 2 (Systematic Theology II)': 'Systematic Theology II',
  'የዕብራይስጥ ቋንቋ መሠረታዊ ጥናት 2': 'Biblical Hebrew II',
  'የሥነ-መለኮት መከላከያና የውይይት ጥበብ (Apologetics)': 'Christian Apologetics & Dialogue',
  'የተግባር አገልግሎትና የቤተ ክርስቲያን ኢንተርንሺፕ': 'Practical Ministry & Church Internship',
  'የድግሪ የምረቃ ጥናትና ምርምር ጽሑፍ (Senior Thesis)': 'Senior Degree Thesis',
  'የአጠናንና የምርምር ዘዴ': 'Study & Research Methods',
  'ብሉይ ኪዳን መግቢያ 1': 'Introduction to Old Testament I',
  'አዲስ ኪዳን መግቢያ 1': 'Introduction to New Testament I',
  'አማርኛ ሰዋሰውና የመግባቢያ ክህሎት': 'Amharic Grammar & Communication Skills',
  'ብሉይ ኪዳን መግቢያ 2': 'Introduction to Old Testament II',
  'አዲስ ኪዳን መግቢያ 2': 'Introduction to New Testament II',
  'የጥንቷ ቤተ ክርስቲያን ታሪክ': 'Early Church History',
  'ክርስቲያናዊ ትምህርትና ደቀመዝሙርነት': 'Christian Education & Discipleship',
  'የግሪክ ቋንቋ ጥናት 2 (የአዲስ ኪዳን ንባብ)': 'Biblical Greek II (NT Readings)',
  'ስልታዊ ሥነ-መለኮት 1 (መለኮትና ፍጥረት)': 'Systematic Theology I (God & Creation)',
  'የስብከት ጥበብና ዝግጅት (Homiletics)': 'Homiletics & Sermon Preparation',
  'የሮሜና የገላትያ መልእክት ጥናት': 'Romans & Galatians Studies',
  'የክርስቲያን ጋብቻና ቤተሰብ አገልግሎት': 'Christian Marriage & Family Ministry',
  'ስልታዊ ሥነ-መለኮት 2 (ክርስቶስና ደህንነት)': 'Systematic Theology II (Christ & Salvation)',
  'የመካከለኛው ዘመንና የተሃድሶ ታሪክ': 'Medieval & Reformation History',
  'የወንጌል ስርጭትና የሚሲዮን አመራር': 'Evangelism & Missions Leadership',
  'የአስተዳደርና የበጀት አያያዝ መርሆዎች': 'Administration & Financial Stewardship',
  'የዕብራይስጥ ቋንቋ ጥናት 2 (የብሉይ ኪዳን ንባብ)': 'Biblical Hebrew II (OT Readings)',
  'ስልታዊ ሥነ-መለኮት 3 (ቤተ ክርስቲያንና የመጨረሻው ዘመን)': 'Systematic Theology III (Church & Eschatology)',
  'የክርስቲያን ምክክርና የሥነ-አእምሮ ጤና (Counseling)': 'Christian Counseling & Mental Health',
  'የነቢያት መጻሕፍትና ሥነ-ጽሑፍ ጥናት': 'Prophetic Books & Biblical Literature',
  'የመሪዎች ስልጠናና ተተኪዎችን ማፍራት': 'Leadership Training & Mentoring',
  'ዘመናዊ የሥነ-መለኮት አስተሳሰቦችና ኑፋቄዎች (Apologetics)': 'Modern Theological Movements & Apologetics',
  'የኢትዮጵያ ቤተ ክርስቲያን ታሪክና ተግዳሮቶች': 'Ethiopian Church History & Challenges',
  'የተግባር አገልግሎት ኢንተርንሺፕ (Field Internship)': 'Field Ministry Internship',
  'የምረቃ ጥናትና ምርምር ጽሑፍ (Senior Graduation Thesis)': 'Senior Graduation Thesis'
};

export function formatCourseTitle(name: string | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  if (!name) return '';
  if (lang !== 'en') return name;
  return COURSE_EN_MAP[name.trim()] || name;
}

export function formatSchedule(schedule: string | undefined, lang: AppLanguage = getCurrentLanguage()): string {
  if (!schedule) return '';
  if (lang !== 'en') return schedule;
  return schedule
    .replace(/ዓ\.ም/g, 'E.C.')
    .replace(/1ኛ ሴሚስተር/g, '1st Semester')
    .replace(/2ኛ ሴሚስተር/g, '2nd Semester')
    .replace(/3ኛ ሴሚስተር/g, '3rd Semester')
    .replace(/4ኛ ሴሚስተር/g, '4th Semester')
    .replace(/መስከረም/g, 'Meskerem')
    .replace(/ጥቅምት/g, 'Tikimt')
    .replace(/ህዳር/g, 'Hidar')
    .replace(/ኅዳር/g, 'Hidar')
    .replace(/ታህሳስ/g, 'Tahsas')
    .replace(/ታኅሣሥ/g, 'Tahsas')
    .replace(/ጥር/g, 'Tir')
    .replace(/የካቲት/g, 'Yekatit')
    .replace(/መጋቢት/g, 'Megabit')
    .replace(/ሚያዝያ/g, 'Miazia')
    .replace(/ግንቦት/g, 'Ginbot')
    .replace(/ሰኔ/g, 'Sene');
}

const VERSE_THEME_EN: Record<string, string> = {
  'ሁሉም': 'All',
  'ጥበብና እውቀት': 'Wisdom & Knowledge',
  'ትምህርትና ማስተዋል': 'Instruction & Understanding',
  'እምነትና ተስፋ': 'Faith & Hope',
  'ትጋትና በረከት': 'Diligence & Blessing',
  'ፍቅርና ሰላም': 'Love & Peace',
  'ጸሎትና ምስጋና': 'Prayer & Thanksgiving',
  'ትዕግሥትና ብርታት': 'Patience & Strength'
};

export function formatVerseTheme(theme: string, lang: AppLanguage = getCurrentLanguage()): string {
  if (lang !== 'en') return theme;
  return VERSE_THEME_EN[theme] || theme;
}

const BOOK_EN_MAP: Array<[string, string]> = [
  ['1ኛ ወደ ቆሮንቶስ ሰዎች', '1 Corinthians'],
  ['2ኛ ወደ ቆሮንቶስ ሰዎች', '2 Corinthians'],
  ['1ኛ ወደ ተሰሎንቄ ሰዎች', '1 Thessalonians'],
  ['2ኛ ወደ ጢሞቴዎስ', '2 Timothy'],
  ['1ኛ የጴጥሮስ መልእክት', '1 Peter'],
  ['1ኛ የዮሐንስ መልእክት', '1 John'],
  ['የሐዋርያት ሥራ', 'Acts'],
  ['ወደ ፊልጵስዩስ ሰዎች', 'Philippians'],
  ['ወደ ቆላስይስ ሰዎች', 'Colossians'],
  ['ወደ ዕብራውያን ሰዎች', 'Hebrews'],
  ['ወደ ኤፌሶን ሰዎች', 'Ephesians'],
  ['ወደ ገላትያ ሰዎች', 'Galatians'],
  ['ወደ ሮሜ ሰዎች', 'Romans'],
  ['የያዕቆብ መልእክት', 'James'],
  ['የማቴዎስ ወንጌል', 'Matthew'],
  ['የዮሐንስ ወንጌል', 'John'],
  ['መጽሐፈ ምሳሌ', 'Proverbs'],
  ['መዝሙረ ዳዊት', 'Psalms'],
  ['መጽሐፈ መክብብ', 'Ecclesiastes'],
  ['ትንቢተ ኢሳይያስ', 'Isaiah'],
  ['ትንቢተ ኤርምያስ', 'Jeremiah'],
  ['ትንቢተ ሚክያስ', 'Micah'],
  ['መጽሐፈ ሲራክ', 'Sirach'],
  ['መጽሐፈ ኢያሱ', 'Joshua'],
  ['ኦሪት ዘዳግም', 'Deuteronomy']
];

export function formatVerseReference(reference: string, lang: AppLanguage = getCurrentLanguage()): string {
  if (lang !== 'en') return reference;
  let out = reference;
  for (const [amBook, enBook] of BOOK_EN_MAP) {
    if (out.includes(amBook)) {
      out = out.replace(amBook, enBook);
      break;
    }
  }
  return out;
}

const VERSE_SUMMARY_EN: Record<string, string> = {
  'ጥበብና እውቀት': 'True wisdom, understanding, and knowledge begin with reverence for the Lord and walking in His truth.',
  'ትምህርትና ማስተዋል': 'Seek sound instruction, meditate on God’s Word, and put biblical understanding into faithful practice.',
  'እምነትና ተስፋ': 'Trust in the Lord wholeheartedly; He guides your path, strengthens your faith, and secures your hope.',
  'ትጋትና በረከት': 'Commit every study and labor diligently to the Lord, doing all things faithfully for His glory.',
  'ፍቅርና ሰላም': 'Walk in Christlike love, humility, forgiveness, and the surpassing peace of God.',
  'ጸሎትና ምስጋና': 'Bring every request to God in constant prayer and joyful thanksgiving.',
  'ትዕግሥትና ብርታት': 'Be strong and courageous in every trial, for the Lord renews the strength of those who wait on Him.'
};

export function formatVerseDisplay(
  verse: DailyVerse,
  lang: AppLanguage = getCurrentLanguage()
): { text: string; reference: string; theme: string; amharicSubtext?: string } {
  if (lang !== 'en') {
    return {
      text: verse.text,
      reference: verse.reference,
      theme: verse.theme
    };
  }
  return {
    text: VERSE_SUMMARY_EN[verse.theme] || 'Walk faithfully in God’s Word, wisdom, and grace today.',
    reference: formatVerseReference(verse.reference, 'en'),
    theme: formatVerseTheme(verse.theme, 'en'),
    amharicSubtext: verse.text
  };
}

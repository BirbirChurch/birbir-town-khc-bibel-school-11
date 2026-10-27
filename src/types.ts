export type UserRole = 'ADMIN' | 'DEAN' | 'REGISTRAR' | 'TEACHER' | 'STUDENT';

export interface CurrentUser {
  role: UserRole;
  id: string; // username, teacher name, or student id
  uid?: string; // unique student uid if student
  name: string;
  program?: ProgramType;
}

export type ProgramType = 'Degree' | 'Diploma';

export type DegreeTrackType = '2_YEAR' | '3_YEAR'; // 2_YEAR = ቅድመ-ዲፕሎማ ላላቸው (4 ሴሚስተር), 3_YEAR = መደበኛ (5-6 ሴሚስተር)

export type GraduationStatus = 'ACTIVE' | 'CANDIDATE' | 'GRADUATED';

export interface Student {
  uid: string; // Unique identifier (e.g. 'dip_201901', 'deg_201901')
  id: string;  // Official Student ID
  name: string;
  gender: 'ወንድ' | 'ሴት';
  program: ProgramType;
  phone?: string;
  photoUrl?: string;
  admissionYear?: string; // የገቡበት የትምህርት ዘመን (እንደ ኢትዮጵያ ዘመን አቆጣጠር - ምሳሌ: 2018, 2019 ዓ.ም)
  currentStudyYear?: number; // 1 = 1ኛ ዓመት, 2 = 2ኛ ዓመት, 3 = 3ኛ ዓመት
  degreeTrack?: DegreeTrackType; // ለድግሪ ተማሪዎች: የ2 ዓመት (ቀድሞ ዲፕሎማ ያላቸው) ወይስ መደበኛ የ3 ዓመት
  priorDiploma?: boolean; // ቀድሞ የመጽሐፍ ቅዱስ ዲፕሎማ አላቸው/የላቸውም
  graduationStatus?: GraduationStatus; // ACTIVE (በመማር ላይ), CANDIDATE (ተማራቂ), GRADUATED (የተመረቀ)
  graduationYear?: string; // የተመረቁበት የትምህርት ዘመን (ዓ.ም)
  graduationSemester?: string; // የተመረቁበት ሴሚስተር
  graduationApprovedBy?: {
    admin?: boolean;     // የዋና አድሚን ይሁንታ
    dean?: boolean;      // የዋና ዲን ይሁንታ
    registrar?: boolean; // የሪጅስተራል ይሁንታ
  };
  graduationRemarks?: string;
}

export interface AssessmentCriterionItem {
  id: string;
  label: string;
  max: number;
}

export interface CourseAssessmentConfig {
  items?: AssessmentCriterionItem[];
  p1Label?: string;
  p1Max?: number;
  p2Label?: string;
  p2Max?: number;
  midLabel?: string;
  midMax?: number;
  finalLabel?: string;
  finalMax?: number;
  attLabel?: string;
  attMax?: number;
}

export interface Course {
  id: string;
  program: ProgramType;
  name: string;
  teacher: string;
  schedule: string; // e.g. "መስከረም 11 – 25/2019"
  credits: number;
  code?: string; // e.g. "DIP-101", "BTH-201"
  academicYear?: string; // e.g. "2018", "2019"
  semester?: string; // e.g. "1", "2"
  remarks?: string;
  assessmentConfig?: CourseAssessmentConfig;
}


export interface GradeBreakdown {
  p1: number;           // ክፍል 1 (max 20 default)
  p2: number;           // ክፍል 2 (max 20 default)
  mid: number;          // ሚድ ፈተና (max 30 default)
  final: number;        // ፋይናል (max 20 default)
  att: number;          // ተሳትፎ (max 10 default)
  scores?: Record<string, number>; // dynamic criteria scores by criterion ID
  customTotal?: number; // ድምር (100%) - መምህራን በቀጥታ ኤዲት የሚያደርጉት
  customLetter?: string;// ፊደል ደረጃ - መምህራን በቀጥታ የሚመርጡት/የሚያርሙት
  customDesc?: string;  // ትርጉም - መምህራን በቀጥታ ኤዲት የሚያደርጉት
}

export interface GradeDetail {
  score: number;
  letter: string;
  points: number;
  desc: string;
}

export interface GradingScaleItem {
  min: number;
  max: number;
  letter: string;
  points: number;
  desc: string;
}

export interface SystemNotification {
  id: string;
  text: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface OfficialSignaturesConfig {
  showStamp: boolean;
  stampImage?: string; // custom stamp base64 or URL
  useChurchLogoAsStamp?: boolean; // toggle to use official church logo as seal
  
  showDeanSignature: boolean;
  deanSignatureImage?: string; // signature base64
  deanName?: string;
  deanTitle?: string;

  showRegistrarSignature: boolean;
  registrarSignatureImage?: string; // signature base64
  registrarName?: string;
  registrarTitle?: string;
}


import { ProgramType, Course } from '../types.ts';

export interface CurriculumSemester {
  semesterIndex: number; // 1, 2, 3, 4, 5, 6
  yearNumber: number; // 1, 2, 3
  semesterInYear: number; // 1 or 2
  semesterLabel: string; // e.g. "1ኛ ዓመት - 1ኛ ሴሚስተር"
  courses: {
    id: string;
    code: string;
    name: string;
    credits: number;
    teacher: string;
  }[];
}

// Complete 2-Year (4 Semesters) Diploma Curriculum
export const DIPLOMA_CURRICULUM: CurriculumSemester[] = [
  {
    semesterIndex: 1,
    yearNumber: 1,
    semesterInYear: 1,
    semesterLabel: '1ኛ ዓመት — 1ኛ ሴሚስተር',
    courses: [
      { id: 'dip_sem1_1', code: 'DIP-101', name: 'እግዚአብሔርና መጽሐፍ ቅዱስ', credits: 3, teacher: 'መ/ር አስራት አማኑኤል' },
      { id: 'dip_sem1_2', code: 'DIP-102', name: 'የመጽሐፍ ቅዱስ አጠናን ዘዴ', credits: 2, teacher: 'መ/ር ሕዝቅኤል ባካሎ' },
      { id: 'dip_sem1_3', code: 'DIP-103', name: 'የመጽሐፍ ቅዱስ ሥነ-አፈታት (Hermeneutics)', credits: 3, teacher: 'መ/ር አየለ አንጁሎ' },
      { id: 'dip_sem1_4', code: 'DIP-104', name: 'የክርስቲያን ሥነ-ምግባር (Christian Ethics)', credits: 2, teacher: 'መ/ር ገላቲያ ድስታ' },
      { id: 'dip_sem1_5', code: 'DIP-105', name: 'ብሉይ ኪዳን ጥናት 1', credits: 3, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'dip_sem1_6', code: 'DIP-106', name: 'አዲስ ኪዳን ጥናት 1', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'dip_sem1_7', code: 'DIP-107', name: 'መንፈስ ቅዱስና መናፍስት', credits: 2, teacher: 'ፓ/ር ጉጃ ኡባ' },
      { id: 'dip_sem1_8', code: 'DIP-108', name: 'ክርስቶስና ደህንነት (Soteriology)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' }
    ]
  },
  {
    semesterIndex: 2,
    yearNumber: 1,
    semesterInYear: 2,
    semesterLabel: '1ኛ ዓመት — 2ኛ ሴሚስተር',
    courses: [
      { id: 'dip_sem2_1', code: 'DIP-109', name: 'ብሉይ ኪዳን ጥናት 2 (የታሪክ መጻሕፍት)', credits: 3, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'dip_sem2_2', code: 'DIP-110', name: 'አዲስ ኪዳን ጥናት 2 (መልእክታት)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'dip_sem2_3', code: 'DIP-111', name: 'የቤተ ክርስቲያን ታሪክ 1', credits: 2, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'dip_sem2_4', code: 'DIP-112', name: 'የስብከት ጥበብ (Homiletics 1)', credits: 3, teacher: 'መ/ር አሸናፊ ሆጋጎ' },
      { id: 'dip_sem2_5', code: 'DIP-113', name: 'የግል ወንጌል ስርጭትና ደቀመዝሙርነት', credits: 2, teacher: 'ፓ/ር ጉጃ ኡባ' },
      { id: 'dip_sem2_6', code: 'DIP-114', name: 'የክርስትና ትምህርት መሠረታዊ እውነቶች', credits: 3, teacher: 'መ/ር አስራት አማኑኤል' }
    ]
  },
  {
    semesterIndex: 3,
    yearNumber: 2,
    semesterInYear: 1,
    semesterLabel: '2ኛ ዓመት — 1ኛ ሴሚስተር (3ኛ ሴሚስተር)',
    courses: [
      { id: 'dip_sem3_1', code: 'DIP-201', name: 'የነቢያት መጻሕፍት ጥናት (Prophetic Books)', credits: 3, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'dip_sem3_2', code: 'DIP-202', name: 'የሮሜ መልእክት ሥነ-መለኮት', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'dip_sem3_3', code: 'DIP-203', name: 'የመጋቢነት አገልግሎትና አመራር', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'dip_sem3_4', code: 'DIP-204', name: 'የክርስቲያን ጋብቻና ቤተሰብ ምክክር', credits: 2, teacher: 'መ/ር አየለ አንጁሎ' },
      { id: 'dip_sem3_5', code: 'DIP-205', name: 'የቤተ ክርስቲያን ተከላና እድገት', credits: 2, teacher: 'መ/ር አሸናፊ ሆጋጎ' },
      { id: 'dip_sem3_6', code: 'DIP-206', name: 'የአምልኮና ዝማሬ አገልግሎት መመሪያ', credits: 2, teacher: 'መ/ር ገላቲያ ድስታ' }
    ]
  },
  {
    semesterIndex: 4,
    yearNumber: 2,
    semesterInYear: 2,
    semesterLabel: '2ኛ ዓመት — 2ኛ ሴሚስተር (4ኛ ሴሚስተር — የምረቃ ሴሚስተር)',
    courses: [
      { id: 'dip_sem4_1', code: 'DIP-207', name: 'የመጨረሻው ዘመን ትምህርት (Eschatology)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'dip_sem4_2', code: 'DIP-208', name: 'የተግባር አገልግሎት ልምምድ (Practical Ministry)', credits: 4, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'dip_sem4_3', code: 'DIP-209', name: 'የሐሰት ትምህርቶችና የኑፋቄ መከላከያ (Apologetics)', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'dip_sem4_4', code: 'DIP-210', name: 'የሕፃናትና ወጣቶች አገልግሎት', credits: 2, teacher: 'መ/ር ሕዝቅኤል ባካሎ' },
      { id: 'dip_sem4_5', code: 'DIP-211', name: 'የምረቃ የምርምር ጽሑፍ (Graduation Project)', credits: 3, teacher: 'መ/ር አስራት አማኑኤል' }
    ]
  }
];

// Complete 2-Year (4 Semesters) Degree Curriculum for Prior Bible Diploma Holders
export const DEGREE_PRIOR_DIPLOMA_CURRICULUM: CurriculumSemester[] = [
  {
    semesterIndex: 1,
    yearNumber: 1,
    semesterInYear: 1,
    semesterLabel: '1ኛ ዓመት — 1ኛ ሴሚስተር (ቅድመ-ዲፕሎማ ታሳቢ)',
    courses: [
      { id: 'deg_p_1', code: 'BTH-201', name: 'የላቀ ሥነ-አፈታት (Advanced Hermeneutics)', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_p_2', code: 'BTH-202', name: 'እግዚአብሔርና መጽሐፍ ቅዱስ ሥነ-መለኮት', credits: 3, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'deg_p_3', code: 'BTH-203', name: 'የሥነ-መለኮት ምርምርና አጠናን ዘዴ', credits: 2, teacher: 'መ/ር ሕዝቅኤል ባካሎ' },
      { id: 'deg_p_4', code: 'BTH-204', name: 'ብሉይ ኪዳን ሥነ-መለኮት 1 (ኦሪትና ታሪክ)', credits: 3, teacher: 'መ/ር አሸናፊ ሆጋጎ' },
      { id: 'deg_p_5', code: 'BTH-205', name: 'አዲስ ኪዳን ሥነ-መለኮት 1 (ወንጌላት)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_p_6', code: 'BTH-206', name: 'የግሪክ ቋንቋ መሠረታዊ ጥናት 1', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_p_7', code: 'BTH-207', name: 'ፍልስፍናና ክርስቲያናዊ አስተሳሰብ', credits: 2, teacher: 'መ/ር ሰሎሞን ሶርሳ' }
    ]
  },
  {
    semesterIndex: 2,
    yearNumber: 1,
    semesterInYear: 2,
    semesterLabel: '1ኛ ዓመት — 2ኛ ሴሚስተር',
    courses: [
      { id: 'deg_p_8', code: 'BTH-208', name: 'የግሪክ ቋንቋ መሠረታዊ ጥናት 2', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_p_9', code: 'BTH-209', name: 'ብሉይ ኪዳን ሥነ-መለኮት 2 (የጥበብና የትንቢት መጻሕፍት)', credits: 3, teacher: 'መ/ር አሸናፊ ሆጋጎ' },
      { id: 'deg_p_10', code: 'BTH-210', name: 'አዲስ ኪዳን ሥነ-መለኮት 2 (የጳውሎስ መልእክታት)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_p_11', code: 'BTH-211', name: 'ሥርዓተ-ትምህርትና የመጽሐፍ ቅዱስ ትምህርት አመራር', credits: 3, teacher: 'መ/ር ሕዝቅኤል ባካሎ' },
      { id: 'deg_p_12', code: 'BTH-212', name: 'ዓለም አቀፍ የሚሲዮን ታሪክና ስትራቴጂ', credits: 2, teacher: 'ፓ/ር መስፍን ሞላ' }
    ]
  },
  {
    semesterIndex: 3,
    yearNumber: 2,
    semesterInYear: 1,
    semesterLabel: '2ኛ ዓመት — 1ኛ ሴሚስተር (3ኛ ሴሚስተር)',
    courses: [
      { id: 'deg_p_13', code: 'BTH-301', name: 'የስልታዊ ሥነ-መለኮት ጥናት 1 (Systematic Theology I)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_p_14', code: 'BTH-302', name: 'የዕብራይስጥ ቋንቋ መሠረታዊ ጥናት 1', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_p_15', code: 'BTH-303', name: 'የላቀ የስብከትና የማስተማር ሥነ-ዘዴ (Homiletics II)', credits: 3, teacher: 'መ/ር አሸናፊ ሆጋጎ' },
      { id: 'deg_p_16', code: 'BTH-304', name: 'የቤተ ክርስቲያን አስተዳደርና ድርጅታዊ አመራር', credits: 3, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'deg_p_17', code: 'BTH-305', name: 'የክርስቲያን ሥነ-ልቦናዊ ምክክር (Pastoral Counseling)', credits: 3, teacher: 'መ/ር አየለ አንጁሎ' }
    ]
  },
  {
    semesterIndex: 4,
    yearNumber: 2,
    semesterInYear: 2,
    semesterLabel: '2ኛ ዓመት — 2ኛ ሴሚስተር (4ኛ ሴሚስተር — የምረቃ ሴሚስተር)',
    courses: [
      { id: 'deg_p_18', code: 'BTH-306', name: 'የስልታዊ ሥነ-መለኮት ጥናት 2 (Systematic Theology II)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_p_19', code: 'BTH-307', name: 'የዕብራይስጥ ቋንቋ መሠረታዊ ጥናት 2', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_p_20', code: 'BTH-308', name: 'የሥነ-መለኮት መከላከያና የውይይት ጥበብ (Apologetics)', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_p_21', code: 'BTH-309', name: 'የተግባር አገልግሎትና የቤተ ክርስቲያን ኢንተርንሺፕ', credits: 3, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'deg_p_22', code: 'BTH-310', name: 'የድግሪ የምረቃ ጥናትና ምርምር ጽሑፍ (Senior Thesis)', credits: 4, teacher: 'መ/ር ሰሎሞን ሶርሳ' }
    ]
  }
];

// Complete 3-Year (6 Semesters) Regular Degree Curriculum
export const REGULAR_DEGREE_CURRICULUM: CurriculumSemester[] = [
  {
    semesterIndex: 1,
    yearNumber: 1,
    semesterInYear: 1,
    semesterLabel: '1ኛ ዓመት — 1ኛ ሴሚስተር',
    courses: [
      { id: 'deg_r_1', code: 'BTH-101', name: 'ሥነ-አፈታት (Hermeneutics)', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_r_2', code: 'BTH-102', name: 'እግዚአብሔርና መጽሐፍ ቅዱስ', credits: 3, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'deg_r_3', code: 'BTH-103', name: 'የአጠናንና የምርምር ዘዴ', credits: 2, teacher: 'መ/ር ሕዝቅኤል ባካሎ' },
      { id: 'deg_r_4', code: 'BTH-104', name: 'ብሉይ ኪዳን መግቢያ 1', credits: 3, teacher: 'መ/ር አሸናፊ ሆጋጎ' },
      { id: 'deg_r_5', code: 'BTH-105', name: 'አዲስ ኪዳን መግቢያ 1', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_r_6', code: 'BTH-106', name: 'አማርኛ ሰዋሰውና የመግባቢያ ክህሎት', credits: 2, teacher: 'መ/ር ገላቲያ ድስታ' }
    ]
  },
  {
    semesterIndex: 2,
    yearNumber: 1,
    semesterInYear: 2,
    semesterLabel: '1ኛ ዓመት — 2ኛ ሴሚስተር',
    courses: [
      { id: 'deg_r_7', code: 'BTH-107', name: 'ብሉይ ኪዳን መግቢያ 2', credits: 3, teacher: 'መ/ር አሸናፊ ሆጋጎ' },
      { id: 'deg_r_8', code: 'BTH-108', name: 'አዲስ ኪዳን መግቢያ 2', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_r_9', code: 'BTH-109', name: 'የጥንቷ ቤተ ክርስቲያን ታሪክ', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_r_10', code: 'BTH-110', name: 'የግሪክ ቋንቋ መሠረታዊ ጥናት 1', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_r_11', code: 'BTH-111', name: 'ክርስቲያናዊ ትምህርትና ደቀመዝሙርነት', credits: 2, teacher: 'መ/ር ሕዝቅኤል ባካሎ' }
    ]
  },
  {
    semesterIndex: 3,
    yearNumber: 2,
    semesterInYear: 1,
    semesterLabel: '2ኛ ዓመት — 1ኛ ሴሚስተር',
    courses: [
      { id: 'deg_r_12', code: 'BTH-201', name: 'የግሪክ ቋንቋ ጥናት 2 (የአዲስ ኪዳን ንባብ)', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_r_13', code: 'BTH-202', name: 'ስልታዊ ሥነ-መለኮት 1 (መለኮትና ፍጥረት)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_r_14', code: 'BTH-203', name: 'የስብከት ጥበብና ዝግጅት (Homiletics)', credits: 3, teacher: 'መ/ር አሸናፊ ሆጋጎ' },
      { id: 'deg_r_15', code: 'BTH-204', name: 'የሮሜና የገላትያ መልእክት ጥናት', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_r_16', code: 'BTH-205', name: 'የክርስቲያን ጋብቻና ቤተሰብ አገልግሎት', credits: 2, teacher: 'መ/ር አየለ አንጁሎ' }
    ]
  },
  {
    semesterIndex: 4,
    yearNumber: 2,
    semesterInYear: 2,
    semesterLabel: '2ኛ ዓመት — 2ኛ ሴሚስተር',
    courses: [
      { id: 'deg_r_17', code: 'BTH-206', name: 'የዕብራይስጥ ቋንቋ መሠረታዊ ጥናት 1', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_r_18', code: 'BTH-207', name: 'ስልታዊ ሥነ-መለኮት 2 (ክርስቶስና ደህንነት)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_r_19', code: 'BTH-208', name: 'የመካከለኛው ዘመንና የተሃድሶ ታሪክ', credits: 3, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'deg_r_20', code: 'BTH-209', name: 'የወንጌል ስርጭትና የሚሲዮን አመራር', credits: 2, teacher: 'ፓ/ር ጉጃ ኡባ' },
      { id: 'deg_r_21', code: 'BTH-210', name: 'የአስተዳደርና የበጀት አያያዝ መርሆዎች', credits: 2, teacher: 'መ/ር አስራት አማኑኤል' }
    ]
  },
  {
    semesterIndex: 5,
    yearNumber: 3,
    semesterInYear: 1,
    semesterLabel: '3ኛ ዓመት — 1ኛ ሴሚስተር (5ኛ ሴሚስተር)',
    courses: [
      { id: 'deg_r_22', code: 'BTH-301', name: 'የዕብራይስጥ ቋንቋ ጥናት 2 (የብሉይ ኪዳን ንባብ)', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_r_23', code: 'BTH-302', name: 'ስልታዊ ሥነ-መለኮት 3 (ቤተ ክርስቲያንና የመጨረሻው ዘመን)', credits: 3, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_r_24', code: 'BTH-303', name: 'የክርስቲያን ምክክርና የሥነ-አእምሮ ጤና (Counseling)', credits: 3, teacher: 'መ/ር አየለ አንጁሎ' },
      { id: 'deg_r_25', code: 'BTH-304', name: 'የነቢያት መጻሕፍትና ሥነ-ጽሑፍ ጥናት', credits: 3, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'deg_r_26', code: 'BTH-305', name: 'የመሪዎች ስልጠናና ተተኪዎችን ማፍራት', credits: 2, teacher: 'መ/ር አሸናፊ ሆጋጎ' }
    ]
  },
  {
    semesterIndex: 6,
    yearNumber: 3,
    semesterInYear: 2,
    semesterLabel: '3ኛ ዓመት — 2ኛ ሴሚስተር (6ኛ ሴሚስተር — የምረቃ ሴሚስተር)',
    courses: [
      { id: 'deg_r_27', code: 'BTH-306', name: 'ዘመናዊ የሥነ-መለኮት አስተሳሰቦችና ኑፋቄዎች (Apologetics)', credits: 3, teacher: 'መ/ር ሰሎሞን ሶርሳ' },
      { id: 'deg_r_28', code: 'BTH-307', name: 'የኢትዮጵያ ቤተ ክርስቲያን ታሪክና ተግዳሮቶች', credits: 2, teacher: 'መ/ር ታዴዎስ ሚልክያስ' },
      { id: 'deg_r_29', code: 'BTH-308', name: 'የተግባር አገልግሎት ኢንተርንሺፕ (Field Internship)', credits: 4, teacher: 'ፓ/ር መስፍን ሞላ' },
      { id: 'deg_r_30', code: 'BTH-309', name: 'የምረቃ ጥናትና ምርምር ጽሑፍ (Senior Graduation Thesis)', credits: 4, teacher: 'መ/ር ሰሎሞን ሶርሳ' }
    ]
  }
];

export function getCurriculumForStudent(student: { program: ProgramType; degreeTrack?: string; priorDiploma?: boolean }): CurriculumSemester[] {
  if (student.program === 'Diploma') {
    return DIPLOMA_CURRICULUM;
  }
  if (student.degreeTrack === '2_YEAR' || student.priorDiploma) {
    return DEGREE_PRIOR_DIPLOMA_CURRICULUM;
  }
  return REGULAR_DEGREE_CURRICULUM;
}

export function getInitial2018HistoricalCourses(): Course[] {
  const list: Course[] = [];
  // Semester 1 (2018 ዓ.ም - 1ኛ ሴሚስተር)
  DIPLOMA_CURRICULUM[0].courses.forEach((c) => {
    list.push({
      id: c.id,
      code: c.code,
      name: c.name,
      teacher: c.teacher,
      credits: c.credits,
      program: 'Diploma',
      academicYear: '2018',
      semester: '1',
      schedule: '2018 ዓ.ም — 1ኛ ሴሚስተር'
    });
  });
  // Semester 2 (2018 ዓ.ም - 2ኛ ሴሚስተር)
  DIPLOMA_CURRICULUM[1].courses.forEach((c) => {
    list.push({
      id: c.id,
      code: c.code,
      name: c.name,
      teacher: c.teacher,
      credits: c.credits,
      program: 'Diploma',
      academicYear: '2018',
      semester: '2',
      schedule: '2018 ዓ.ም — 2ኛ ሴሚስተር'
    });
  });
  return list;
}

export function getDeletedCourseIdsSet(): Set<string> {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('bk_deleted_course_ids');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (_) {}
  }
  return new Set();
}

export function loadHistorical2018Courses(): Course[] {
  const deletedSet = getDeletedCourseIdsSet();
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('bk_historical_2018_courses');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: Course) => c && c.id && !deletedSet.has(c.id));
        }
      }
    } catch (_) {}
  }
  return getInitial2018HistoricalCourses().filter((c) => !deletedSet.has(c.id));
}

export function saveHistorical2018Courses(courseList: Course[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('bk_historical_2018_courses', JSON.stringify(courseList));
    } catch (_) {}
  }
}



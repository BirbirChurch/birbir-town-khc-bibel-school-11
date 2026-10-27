import { GradingScaleItem, Student, Course } from '../types.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import { getInitial2018HistoricalCourses } from './curriculumCourses.ts';

// Official 13-Tier Grading Scale Requested by User
export const OFFICIAL_GRADING_SCALE: GradingScaleItem[] = [
  { min: 97, max: 100, letter: 'A+', points: 4.00, desc: 'እጅግ በጣም ጥሩ' },
  { min: 93, max: 96,  letter: 'A',  points: 4.00, desc: 'በጣም ጥሩ' },
  { min: 90, max: 92,  letter: 'A-', points: 3.66, desc: 'በጣም ጥሩ' },
  { min: 87, max: 89,  letter: 'B+', points: 3.66, desc: 'ጥሩ' },
  { min: 83, max: 86,  letter: 'B',  points: 3.33, desc: 'ጥሩ' },
  { min: 80, max: 82,  letter: 'B-', points: 3.00, desc: 'ደህና' },
  { min: 77, max: 79,  letter: 'C+', points: 2.66, desc: 'አጥጋቢ' },
  { min: 73, max: 76,  letter: 'C',  points: 2.33, desc: 'አልፏል' },
  { min: 70, max: 72,  letter: 'C-', points: 2.00, desc: 'ዝቅተኛ ማለፊያ' },
  { min: 67, max: 69,  letter: 'D+', points: 1.66, desc: 'ዝቅተኛ' },
  { min: 63, max: 66,  letter: 'D',  points: 1.33, desc: 'ዝቅተኛ / ማለፊያ' },
  { min: 60, max: 62,  letter: 'D-', points: 1.00, desc: 'ዝቅተኛ' },
  { min: 0,  max: 59,  letter: 'F',  points: 0.00, desc: 'ወድቋል' }
];

export const PRELOADED_TEACHERS: string[] = [
  'መ/ር ሰሎሞን ሶርሳ',
  'ፓ/ር መስፍን ሞላ',
  'መ/ር ሕዝቅኤል ባካሎ',
  'መ/ር አሸናፊ ሆጋጎ',
  'መ/ር ታዴዎስ ሚልክያስ',
  'መ/ር አስራት አማኑኤል',
  'መ/ር አየለ አንጁሎ',
  'መ/ር ገላቲያ ድስታ',
  'ፓ/ር ጉጃ ኡባ',
  'አልተመደበም (—)'
];

// Raw Diploma Student Roster (35 Students)
const RAW_STUDENTS_DIPLOMA: Student[] = [
  // 10 Students in 2nd Year (በዚህ ዓመት 2ኛ ዓመት እየተማሩ ያሉ 10 ተማሪዎች - 4 ሴሚስተር)
  { uid: 'dip_201801', id: '201801', name: 'አስራት ዳንኤል', gender: 'ወንድ', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'dip_201802', id: '201802', name: 'አማኑኤል ባሳ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'dip_201803', id: '201803', name: 'ስንታየሁ ቱማቶ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'dip_201804', id: '201804', name: 'ጥሩነሽ መሐመድ', gender: 'ሴት', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'dip_201805', id: '201805', name: 'ከፍያለዉ ካስትሮ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'dip_201806', id: '201806', name: 'ማርቆስ ቱማ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'dip_201807', id: '201807', name: 'አስራት ኤልያስ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'dip_201808', id: '201808', name: 'ጠቅላዩ ፎላ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'dip_201811', id: '201811', name: 'ሙሉቀን ዘለቀ ፋልታሞ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'dip_201810', id: '201810', name: 'ደነቀ አለማየሁ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },

  // 25 Students in 1st Year (የ1ኛ ዓመት ተማሪዎች - admissionYear: 2019)
  { uid: 'dip_201901', id: '201901', name: 'ሊዲያ ጳዉሎስ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201902', id: '201902', name: 'መሐመድ ቶማ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201903', id: '201903', name: 'መስከረም ዳዊት', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201904', id: '201904', name: 'መብራት ደምሴ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201905', id: '201905', name: 'ማቴዎስ መስቀሌ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201906', id: '201906', name: 'ማገኝ ማጮ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201907', id: '201907', name: 'ምስራቅ ኩኬ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201908', id: '201908', name: 'ሠራዊት ሳሙኤል', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201909', id: '201909', name: 'ስንቅነሽ ሴታ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201910', id: '201910', name: 'ቤተል መሸሻ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201911', id: '201911', name: 'ቤተል ሳሙኤል', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201912', id: '201912', name: 'ቤዛነህ ማቴዎስ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201913', id: '201913', name: 'ብንያም ሕዝቅኤል', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201914', id: '201914', name: 'ተረፈች ተስፋዬ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201915', id: '201915', name: 'ተመስገን መርድነህ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201916', id: '201916', name: 'ቸርነት ገዛኸኝ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201917', id: '201917', name: 'አልማዝ አበራ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201918', id: '201918', name: 'አመነች ነዉሌ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201919', id: '201919', name: 'አበራ አለቆ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201920', id: '201920', name: 'አበባየሁ አየለ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201921', id: '201921', name: 'አብራሃም ዱቃ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201922', id: '201922', name: 'ዘላለም ማዴቦ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201924', id: '201924', name: 'አማኑኤል አዴማ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201925', id: '201925', name: 'ከፍያለዉ ከማል', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201926', id: '201926', name: 'አበራሽ አዳዬ', gender: 'ሴት', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201927', id: '201927', name: 'በድሉ በላይ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'dip_201928', id: '201928', name: 'ወዳጆ ቶሮ', gender: 'ወንድ', program: 'Diploma', admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' }
];

// Raw Degree Student Roster (35 Students)
const RAW_STUDENTS_DEGREE: Student[] = [
  // 10 Students in Degree with Prior Bible Diploma (የ2 ዓመት ድግሪ - 4 ሴሚስተር - ተማራቂዎች)
  { uid: 'deg_201901', id: '201901', name: 'ሕዝቅኤል ፁንቃ', gender: 'ወንድ', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'deg_201902', id: '201902', name: 'መሐመድ ሀርቶ', gender: 'ወንድ', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'deg_201903', id: '201903', name: 'መሰረት ማቴዎስ', gender: 'ሴት', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'deg_201904', id: '201904', name: 'መንግሥቱ ፎላ', gender: 'ወንድ', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'deg_201905', id: '201905', name: 'ማቱሳላ ጴጥሮስ', gender: 'ወንድ', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'deg_201906', id: '201906', name: 'ማቴዎስ መስቀሌ', gender: 'ወንድ', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'deg_201907', id: '201907', name: 'ማቴዎስ ጁታ', gender: 'ወንድ', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'deg_201908', id: '201908', name: 'ሚኖታ ደባልቄ', gender: 'ወንድ', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'deg_201909', id: '201909', name: 'ምህረት ሚልክያስ', gender: 'ሴት', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },
  { uid: 'deg_201910', id: '201910', name: 'ሳሙኤል ኬቶ', gender: 'ወንድ', program: 'Degree', degreeTrack: '2_YEAR', priorDiploma: true, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'CANDIDATE' },

  // 10 Regular Degree Students in 2nd Year (መደበኛ 2ኛ ዓመት - 5-6 ሴሚስተር)
  { uid: 'deg_201911', id: '201911', name: 'ሳምሶን አብራሃም', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201912', id: '201912', name: 'ሸሪፎ ሻራ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201913', id: '201913', name: 'በረከት ፎላ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201914', id: '201914', name: 'በርገነ ባፋ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201915', id: '201915', name: 'ተመስገን መንግሥቱ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201916', id: '201916', name: 'ታምራት በቀሌ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201917', id: '201917', name: 'ኃይልዬ አድሱ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201918', id: '201918', name: 'አለሙ ሌራ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201919', id: '201919', name: 'አለሙ አራ', gender: 'ሴት', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201920', id: '201920', name: 'አልማዝ አስራት', gender: 'ሴት', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2018', currentStudyYear: 2, graduationStatus: 'ACTIVE' },

  // 15 Regular Degree Students in 1st Year (መደበኛ 1ኛ ዓመት - admissionYear: 2019)
  { uid: 'deg_201921', id: '201921', name: 'አማኑኤል ደቤና', gender: 'ሴት', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201922', id: '201922', name: 'አሰገደች አየለ', gender: 'ሴት', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201923', id: '201923', name: 'አሸብር ከበደ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201924', id: '201924', name: 'አበበች ለራንሶ', gender: 'ሴት', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201925', id: '201925', name: 'አይናለም ማንጁራ', gender: 'ሴት', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201926', id: '201926', name: 'አንዱዓለም ሉቃስ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201927', id: '201927', name: 'አንድነት ለማ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201928', id: '201928', name: 'አኬና አዴቶ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201929', id: '201929', name: 'ኢተነሽ በሩ', gender: 'ሴት', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201930', id: '201930', name: 'ደስታ ጉጋላ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201931', id: '201931', name: 'ጩቃሎ ጩቱሎ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201932', id: '201932', name: 'ጴጥሮስ ገዘኽኝ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201933', id: '201933', name: 'ፈቃደ ብርሃኑ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201934', id: '201934', name: 'አቤል ጴጥሮስ', gender: 'ወንድ', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' },
  { uid: 'deg_201935', id: '201935', name: 'ትክክሏ ሴባ', gender: 'ሴት', program: 'Degree', degreeTrack: '3_YEAR', priorDiploma: false, admissionYear: '2019', currentStudyYear: 1, graduationStatus: 'ACTIVE' }
];

// Pre-sorted student rosters in official Amharic Fidel alphabetical order (ሀ እስከ ፐ)
export const PRELOADED_STUDENTS_DIPLOMA: Student[] = sortStudentsByAmharicName(RAW_STUDENTS_DIPLOMA);
export const PRELOADED_STUDENTS_DEGREE: Student[] = sortStudentsByAmharicName(RAW_STUDENTS_DEGREE);

export const PRELOADED_STUDENTS: Student[] = sortStudentsByAmharicName([
  ...RAW_STUDENTS_DIPLOMA,
  ...RAW_STUDENTS_DEGREE
]);


// Exact Course Allocations
export const PRELOADED_COURSES: Course[] = [
  // 1. Degree Program 1st Semester Courses (የድግሪ ፕሮግራም 1ኛ ሴሚስተር)
  {
    id: 'deg_c1',
    program: 'Degree',
    name: 'ሥነ-አፈታት',
    teacher: 'መ/ር ሰሎሞን ሶርሳ',
    schedule: 'መስከረም 11 – 25/2019',
    credits: 3,
    remarks: ''
  },
  {
    id: 'deg_c2',
    program: 'Degree',
    name: 'እግዚአብሔርና መጽሐፍ ቅዱስ',
    teacher: 'ፓ/ር መስፍን ሞላ',
    schedule: 'መስከረም 26 – ጥቅምት 9/2019',
    credits: 3,
    remarks: ''
  },
  {
    id: 'deg_c3',
    program: 'Degree',
    name: 'አጠናን ዘዴ',
    teacher: 'መ/ር ሕዝቅኤል ባካሎ',
    schedule: 'ጥቅምት 10 – 23/2019',
    credits: 2,
    remarks: ''
  },
  {
    id: 'deg_c4',
    program: 'Degree',
    name: 'ብሉይ ኪዳን 1',
    teacher: 'መ/ር አሸናፊ ሆጋጎ',
    schedule: 'ጥቅምት 24 – ህዳር 7/2019',
    credits: 3,
    remarks: ''
  },
  {
    id: 'deg_c5',
    program: 'Degree',
    name: 'አዲስ ኪዳን 1',
    teacher: 'መ/ር ታዴዎስ ሚልክያስ',
    schedule: 'ህዳር 8 – 21/2019',
    credits: 3,
    remarks: ''
  },
  {
    id: 'deg_c6',
    program: 'Degree',
    name: 'አማርኛ ሰዋሰው',
    teacher: 'አልተመደበም (—)',
    schedule: 'ህዳር 22 – ታህሳስ 5/2019',
    credits: 2,
    remarks: ''
  },
  {
    id: 'deg_c7',
    program: 'Degree',
    name: 'ፍልስፍናና ሥነ-መለኮት',
    teacher: 'መ/ር ሰሎሞን ሶርሳ',
    schedule: 'ታህሳስ 6 – 19/2019',
    credits: 3,
    remarks: ''
  },
  {
    id: 'deg_c8',
    program: 'Degree',
    name: 'የአዲስ ኪዳን ሥነ-መለኮት',
    teacher: 'መ/ር ታዴዎስ ሚልክያስ',
    schedule: 'ጥር 3 – 17/2019',
    credits: 3,
    remarks: ''
  },

  // 2. Diploma Program 1st Semester Courses (የዲፕሎማ ፕሮግራም 1ኛ ሴሚስተር)
  {
    id: 'dip_c1',
    program: 'Diploma',
    name: 'እግዚአብሔርና መጽሐፍ ቅዱስ',
    teacher: 'መ/ር አስራት አማኑኤል',
    schedule: 'መስከረም 11 – 25/2019',
    credits: 3,
    remarks: ''
  },
  {
    id: 'dip_c2',
    program: 'Diploma',
    name: 'አጠናን ዘዴ',
    teacher: 'መ/ር ሕዝቅኤል ባካሎ',
    schedule: 'መስከረም 26 – ጥቅምት 9/2019',
    credits: 2,
    remarks: ''
  },
  {
    id: 'dip_c3',
    program: 'Diploma',
    name: 'ሥነ-አፈታት',
    teacher: 'መ/ር አየለ አንጁሎ',
    schedule: 'ጥቅምት 10 – 23/2019',
    credits: 3,
    remarks: ''
  },
  {
    id: 'dip_c4',
    program: 'Diploma',
    name: 'ሥነ-ምግባር',
    teacher: 'መ/ር ገላቲያ ድስታ',
    schedule: 'ጥቅምት 24 – ህዳር 7/2019',
    credits: 2,
    remarks: ''
  },
  {
    id: 'dip_c5',
    program: 'Diploma',
    name: 'ብሉይ ኪዳን 1',
    teacher: 'ፓ/ር መስፍን ሞላ',
    schedule: 'ህዳር 8 – 21/2019',
    credits: 3,
    remarks: ''
  },
  {
    id: 'dip_c6',
    program: 'Diploma',
    name: 'አዲስ ኪዳን 1',
    teacher: 'መ/ር ታዴዎስ ሚልክያስ',
    schedule: 'ህዳር 22 – ታህሳስ 5/2019',
    credits: 3,
    remarks: ''
  },
  {
    id: 'dip_c7',
    program: 'Diploma',
    name: 'መንፈስ ቅዱስና መናፍስት',
    teacher: 'ፓ/ር ጉጃ ኡባ',
    schedule: 'ታህሳስ 6 – 19/2019',
    credits: 2,
    remarks: ''
  },
  {
    id: 'dip_c8',
    program: 'Diploma',
    name: 'ክርስቶስና ደህንነት',
    teacher: 'መ/ር ታዴዎስ ሚልክያስ',
    schedule: 'ጥር 3 – 17/2019',
    credits: 3,
    remarks: ''
  },
  ...getInitial2018HistoricalCourses()
];

export const DEFAULT_TEACHER_KEYS: Record<string, string> = {
  'መ/ር ሰሎሞን ሶርሳ': 'BK-SOL-2019',
  'ፓ/ር መስፍን ሞላ': 'BK-MES-2019',
  'መ/ር ሕዝቅኤል ባካሎ': 'BK-HIZ-2019',
  'መ/ር አሸናፊ ሆጋጎ': 'BK-ASH-2019',
  'መ/ር ታዴዎስ ሚልክያስ': 'BK-TAD-2019',
  'መ/ር አስራት አማኑኤል': 'BK-ASR-2019',
  'መ/ር አየለ አንጁሎ': 'BK-AYE-2019',
  'መ/ር ገላቲያ ድስታ': 'BK-GEL-2019',
  'ፓ/ር ጉጃ ኡባ': 'BK-GUJ-2019'
};

export function generateTeacherKey(teacherName: string, index = 1): string {
  if (DEFAULT_TEACHER_KEYS[teacherName]) {
    return DEFAULT_TEACHER_KEYS[teacherName];
  }
  const clean = teacherName.replace(/^(መ\/ር|ፓ\/ር|ዶ\/ር|ወ\/ሮ|ወ\/ሪት|አቶ)\s*/, '').trim();
  const prefix = clean.substring(0, 3).toUpperCase() || 'TCH';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BK-${prefix}-${rand}`;
}

// Predefined distinct student passkeys (ST-XXXX) completely separate from Student ID codes
export const DEFAULT_STUDENT_PASSKEYS: Record<string, string> = {
  // Diploma 2nd Year (Graduation Candidates)
  'dip_201801': 'ST-7182',
  'dip_201802': 'ST-4921',
  'dip_201803': 'ST-3814',
  'dip_201804': 'ST-6291',
  'dip_201805': 'ST-5142',
  'dip_201806': 'ST-8231',
  'dip_201807': 'ST-9345',
  'dip_201808': 'ST-4172',
  'dip_201811': 'ST-6351',
  'dip_201810': 'ST-5428',

  // Diploma 1st Year Students
  'dip_201901': 'ST-8142',
  'dip_201902': 'ST-3918',
  'dip_201903': 'ST-7241',
  'dip_201904': 'ST-6153',
  'dip_201905': 'ST-4291',
  'dip_201906': 'ST-5382',
  'dip_201907': 'ST-9214',
  'dip_201908': 'ST-3482',
  'dip_201909': 'ST-7519',
  'dip_201910': 'ST-6425',
  'dip_201911': 'ST-8319',
  'dip_201912': 'ST-4721',
  'dip_201913': 'ST-5932',
  'dip_201914': 'ST-7164',
  'dip_201915': 'ST-3849',
  'dip_201916': 'ST-9512',
  'dip_201917': 'ST-6284',
  'dip_201918': 'ST-4195',
  'dip_201919': 'ST-8371',
  'dip_201920': 'ST-5264',
  'dip_201921': 'ST-7439',
  'dip_201922': 'ST-3915',
  'dip_201924': 'ST-6821',
  'dip_201925': 'ST-4592',
  'dip_201926': 'ST-8147',
  'dip_201927': 'ST-8294',
  'dip_201928': 'ST-7139',

  // Degree 2nd Year (Prior Bible Diploma Candidates)
  'deg_201901': 'ST-3619',
  'deg_201902': 'ST-7524',
  'deg_201903': 'ST-4819',
  'deg_201904': 'ST-9263',
  'deg_201905': 'ST-5371',
  'deg_201906': 'ST-8145',
  'deg_201907': 'ST-6294',
  'deg_201908': 'ST-4738',
  'deg_201909': 'ST-3912',
  'deg_201910': 'ST-8521',

  // Degree 2nd Year Regular Students
  'deg_201911': 'ST-7419',
  'deg_201912': 'ST-5823',
  'deg_201913': 'ST-6194',
  'deg_201914': 'ST-4381',
  'deg_201915': 'ST-9257',
  'deg_201916': 'ST-3714',
  'deg_201917': 'ST-8462',
  'deg_201918': 'ST-5193',
  'deg_201919': 'ST-7628',
  'deg_201920': 'ST-4931',

  // Degree 1st Year Regular Students
  'deg_201921': 'ST-8274',
  'deg_201922': 'ST-6319',
  'deg_201923': 'ST-5482',
  'deg_201924': 'ST-7195',
  'deg_201925': 'ST-3826',
  'deg_201926': 'ST-9418',
  'deg_201927': 'ST-4752',
  'deg_201928': 'ST-8631',
  'deg_201929': 'ST-5294',
  'deg_201930': 'ST-7381',
  'deg_201931': 'ST-6149',
  'deg_201932': 'ST-4893',
  'deg_201933': 'ST-9527',
  'deg_201934': 'ST-3418',
  'deg_201935': 'ST-8762'
};

/**
 * Generates a distinct confidential student passkey (ST-XXXX) separate from their Student ID.
 */
export function generateStudentPasskey(student: { uid: string; id: string; name?: string }, index = 1): string {
  if (DEFAULT_STUDENT_PASSKEYS[student.uid]) {
    return DEFAULT_STUDENT_PASSKEYS[student.uid];
  }
  let hash = 0;
  const str = `${student.uid}_pass_${index}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 9000;
  }
  const code = 1000 + Math.abs(hash);
  return `ST-${code}`;
}

// Generate individual passwords for all users
export function generateInitialUserPasswords(): Record<string, string> {
  const p: Record<string, string> = {
    admin: 'admin123',
    dean: 'dean123',
    registrar: 'reg123'
  };

  // Each teacher gets their own unique secure key
  PRELOADED_TEACHERS.forEach((t, idx) => {
    if (!t.includes('—')) {
      p[t] = DEFAULT_TEACHER_KEYS[t] || generateTeacherKey(t, idx + 1);
    }
  });

  // Each student gets their own distinct passkey (ST-XXXX) — NEVER their Student ID code!
  PRELOADED_STUDENTS.forEach((s, idx) => {
    p[s.uid] = DEFAULT_STUDENT_PASSKEYS[s.uid] || generateStudentPasskey(s, idx + 1);
  });

  return p;
}


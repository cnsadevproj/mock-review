export interface SubjectItem {
  id: number
  subjectGroup: string
  subjectName: string
  major: string
  middle: string
  minor: string
}

export interface Exam {
  examId: string
  name: string
  year: number
  month: number
  date: string
  papers?: Record<string, string>
}

export interface User {
  email: string
  name: string
  grade: number
  class: number
  number: number
  role: 'student' | 'teacher'
}

export interface WrongAnswer {
  subjectName: string
  questionNo: number
  subjectIds: number[]
}

export interface Response {
  email: string
  examId: string
  subjectName: string
  questionNo: number
  subjectIds: number[]
  createdAt: string
}

export interface Plan {
  email: string
  examId: string
  rank: number
  major: string
  middle: string
  minor: string
  textbook: string
  hours: string
  goal: string
  period: string
  notes: string
  learnings: string
  createdAt: string
}


export const SUBJECT_QUESTIONS: Record<string, number> = {
  '국어': 45,
  '수학': 30,
  '영어': 45,
  '한국사': 20,
  '사회탐구': 20,
  '과학탐구': 20,
}

export const SUBJECT_GROUP_ORDER = ['국어', '수학', '영어', '한국사', '사회탐구', '과학탐구'] as const

// 시험 월별 응시 가능 선택과목
// 3,5,7,10월(고3): 확통/미적/기하, 사탐(생윤~통사), 과탐I
// 6,9월: 위 + 과탐II
// 11월(수능): 위 + 과탐II (통합과학/통합사회 제외)
// ※ 통합과학/통합사회는 고1 전용(3월만)

const MATH_CHOICES = ['확률과 통계', '미적분', '기하']
const SOCIAL_CHOICES = ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '정치와 법', '경제', '사회문화']
const SCIENCE_I = ['물리학 I', '화학 I', '생명과학 I', '지구과학  I']
const SCIENCE_II = ['물리학 II', '화학 II', '생명과학 II', '지구과학 II']

export function getAvailableSubjects(month: number): {
  math: string[]
  social: string[]
  science: string[]
} {
  const math = MATH_CHOICES
  const social = SOCIAL_CHOICES
  let science = [...SCIENCE_I]

  if ([6, 9, 11].includes(month)) {
    science = [...SCIENCE_I, ...SCIENCE_II]
  }

  return { math, social, science }
}

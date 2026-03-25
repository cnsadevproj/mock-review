import { Exam } from '@/types'

interface ExamSchedule {
  month: number
  day: number
  type: 'hakryeok' | 'moui' | 'suneung'
}

const SCHEDULES: Record<number, ExamSchedule[]> = {
  2026: [
    { month: 3, day: 24, type: 'hakryeok' },
    { month: 5, day: 7, type: 'hakryeok' },
    { month: 6, day: 4, type: 'moui' },
    { month: 7, day: 8, type: 'hakryeok' },
    { month: 9, day: 2, type: 'moui' },
    { month: 10, day: 20, type: 'hakryeok' },
    { month: 11, day: 19, type: 'suneung' },
  ],
}

function getExamName(year: number, s: ExamSchedule): string {
  if (s.type === 'suneung') return `${s.month}.${s.day} 수능`
  const typeLabel = s.type === 'moui' ? '모의평가' : '학력평가'
  return `${s.month}.${s.day} ${typeLabel}`
}

function buildExams(year: number): Exam[] {
  const schedule = SCHEDULES[year]
  if (!schedule) return []
  return schedule.map((s) => ({
    examId: `exam_${year}${String(s.month).padStart(2, '0')}`,
    name: getExamName(year, s),
    year,
    month: s.month,
    date: `${year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`,
  }))
}

export function getPastExams(): Exam[] {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const exams: Exam[] = []
  for (const year of Object.keys(SCHEDULES).map(Number).sort()) {
    for (const e of buildExams(year)) {
      if (e.date <= today) exams.push(e)
    }
  }
  return exams.reverse()
}

export function getCurrentExam(): Exam {
  const exams = getPastExams()
  return exams.length > 0 ? exams[0] : buildExams(2026)[0]
}

export function getAllExamsForYear(year: number): Exam[] {
  return buildExams(year)
}

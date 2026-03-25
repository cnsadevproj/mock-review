'use client'

import { useState, useEffect, useMemo } from 'react'
import { getCurrentExam, getPastExams } from '@/lib/exams'
import { gasGetClassResponses, gasGetAllUsers, gasGetPlans, gasGetSchedule, gasGetReflection } from '@/lib/gas'
import { getSubjectById } from '@/lib/subjects'
import Spinner from '@/components/Spinner'
import RadarChart from '@/components/RadarChart'

interface ClassResponse {
  email: string
  subjectName: string
  questionNo: number
  subjectIds: number[]
}

interface UserInfo {
  email: string
  name: string
  id: string
  wrongCount: number
}

const TIME_SLOTS = ['ET1', 'ET2', 'EP1-1', 'EP1-2', 'EP2-1', 'EP2-2']
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금']
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri']

function StudentDetailView({ info, exam, detail, loading, onBack }: {
  info?: UserInfo
  exam: { name: string; examId: string }
  detail: {
    responses: ClassResponse[]
    plans: { subjectName: string; questionNo: number; rank: number; goal: string; textbook: string; hours: string; period: string; notes: string; learnings: string }[]
    schedule: { data: Record<string, Record<string, { subject: string }>>; weekendSlots: string[] } | null
    reflection: Record<string, string> | null
  } | null
  loading: boolean
  onBack: () => void
}) {
  const [showAllWrong, setShowAllWrong] = useState(false)
  const [showAllPlans, setShowAllPlans] = useState(false)

  const wrongTypes = useMemo(() => {
    if (!detail) return []
    const types: Record<string, number> = {}
    for (const r of detail.responses) {
      for (const id of r.subjectIds) {
        const item = getSubjectById(id)
        if (item) types[item.minor] = (types[item.minor] || 0) + 1
      }
    }
    return Object.entries(types).sort(([, a], [, b]) => b - a).slice(0, 5)
  }, [detail])

  const sortedPlans = useMemo(() => {
    if (!detail) return []
    return [...detail.plans].sort((a, b) => (a.rank || 999) - (b.rank || 999))
  }, [detail])

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <button onClick={onBack} className="text-sm text-text-secondary mb-4">&larr; 목록으로</button>

      <h2 className="font-extrabold text-xl mb-1">{info ? `${info.id} ${info.name}` : ''}</h2>
      <p className="text-xs text-text-secondary mb-6">{exam.name}</p>

      {loading ? <Spinner text="학생 데이터 불러오는 중" /> : !detail ? (
        <div className="card py-10 text-center text-text-secondary">데이터를 불러올 수 없습니다</div>
      ) : (
        <div className="space-y-4">
          {wrongTypes.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-sm mb-2">취약 유형</h3>
              <div className="flex flex-wrap gap-1.5">
                {wrongTypes.map(([type, count]) => (
                  <span key={type} className="badge badge-primary text-xs">{type} ({count})</span>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">오답 ({detail.responses.length}개)</h3>
            </div>
            {detail.responses.length === 0 ? (
              <p className="text-sm text-muted">오답 데이터 없음</p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {(showAllWrong ? detail.responses : detail.responses.slice(0, 10)).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.subjectName} {r.questionNo}번</span>
                      <span className="text-xs text-text-secondary truncate ml-2 max-w-[50%] text-right">
                        {r.subjectIds.map((id) => getSubjectById(id)?.minor).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
                {detail.responses.length > 10 && (
                  <button
                    onClick={() => setShowAllWrong(!showAllWrong)}
                    className="text-xs text-primary font-medium mt-2"
                  >
                    {showAllWrong ? '접기' : `나머지 ${detail.responses.length - 10}개 더 보기`}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">보완 계획 ({sortedPlans.length}개)</h3>
            </div>
            {sortedPlans.length === 0 ? (
              <p className="text-sm text-muted">계획서 미작성</p>
            ) : (
              <>
                <div className="space-y-2">
                  {(showAllPlans ? sortedPlans : sortedPlans.slice(0, 8)).map((p, i) => (
                    <div key={i} className="text-sm" style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '6px' }}>
                      <div className="flex items-center gap-2">
                        {p.rank > 0 && <span className="badge badge-primary text-[0.6rem]">{p.rank}순위</span>}
                        <span className="font-medium">{p.subjectName} {p.questionNo}번</span>
                      </div>
                      {p.goal && <div className="text-xs text-text-secondary mt-0.5">목표: {p.goal}</div>}
                      {p.textbook && <div className="text-xs text-text-secondary">교재: {p.textbook}</div>}
                      {p.learnings && <div className="text-xs text-text-secondary mt-1 bg-primary-light/30 px-2 py-1" style={{ borderRadius: '4px' }}>기억: {p.learnings}</div>}
                    </div>
                  ))}
                </div>
                {sortedPlans.length > 8 && (
                  <button
                    onClick={() => setShowAllPlans(!showAllPlans)}
                    className="text-xs text-primary font-medium mt-2"
                  >
                    {showAllPlans ? '접기' : `나머지 ${sortedPlans.length - 8}개 더 보기`}
                  </button>
                )}
              </>
            )}
          </div>

          {detail.schedule && (
            <div className="card">
              <h3 className="font-bold text-sm mb-2">시간표</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-1.5 border border-border bg-primary text-white font-bold w-12">시간</th>
                    {WEEKDAY_LABELS.map((d, i) => (
                      <th key={i} className="p-1.5 border border-border bg-primary text-white font-bold">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot) => (
                    <tr key={slot}>
                      <td className="p-1.5 border border-border bg-primary-light/30 text-center font-bold text-text-secondary">{slot}</td>
                      {WEEKDAY_KEYS.map((day) => {
                        const cell = (detail.schedule as { data: Record<string, Record<string, { subject: string }>> }).data?.[slot]?.[day]
                        return (
                          <td key={day} className="p-1.5 border border-border text-center bg-white">
                            {cell?.subject || ''}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {detail.schedule.weekendSlots && detail.schedule.weekendSlots.length > 0 && (
                <table className="w-full text-xs border-collapse mt-2">
                  <thead>
                    <tr>
                      <th className="p-1.5 border border-border bg-primary text-white font-bold w-16">시간</th>
                      <th className="p-1.5 border border-border bg-primary text-white font-bold">토</th>
                      <th className="p-1.5 border border-border bg-primary text-white font-bold">일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.schedule.weekendSlots.map((slot: string) => (
                      <tr key={slot}>
                        <td className="p-1.5 border border-border bg-primary-light/30 text-center font-bold text-text-secondary">{slot}</td>
                        {['sat', 'sun'].map((day) => {
                          const cell = (detail.schedule as { data: Record<string, Record<string, { subject: string }>> }).data?.[`we_${slot}`]?.[day]
                          return (
                            <td key={day} className="p-1.5 border border-border text-center bg-white">
                              {cell?.subject || ''}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="card">
            <h3 className="font-bold text-sm mb-2">성찰</h3>
            {!detail.reflection ? (
              <p className="text-sm text-muted">성찰 미작성</p>
            ) : (
              <div className="space-y-2 text-sm">
                {[
                  { key: 'weakness', label: '약점 보완 관련' },
                  { key: 'newWeakness', label: '새롭게 파악된 약점' },
                  { key: 'scheduleReview', label: '시간표 구성의 적절성' },
                  { key: 'growth', label: '성장' },
                ].map(({ key, label }) => {
                  const val = detail.reflection?.[key]
                  return val ? (
                    <div key={key}>
                      <span className="font-semibold">{label}</span>
                      <p className="text-text-secondary mt-0.5">{val}</p>
                    </div>
                  ) : null
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ClassView({ classNo, data, userList, onBack, onStudentClick }: {
  classNo: number
  data: ClassResponse[]
  userList: UserInfo[]
  onBack: () => void
  onStudentClick: (email: string) => void
}) {
  const [classFilter, setClassFilter] = useState('전체')

  const classStudents = userList
    .filter((u) => parseInt(u.id.slice(1, 3)) === classNo)
    .sort((a, b) => parseInt(a.id.slice(3, 5)) - parseInt(b.id.slice(3, 5)))

  const classResponses = data.filter((r) => {
    const id = r.email.split('@')[0]
    return /^\d{5}$/.test(id) && parseInt(id.slice(1, 3)) === classNo
  })

  const submitted = classStudents.filter((u) => u.wrongCount > 0).length
  const avgWrong = submitted > 0
    ? (classStudents.reduce((s, u) => s + u.wrongCount, 0) / submitted).toFixed(1) : '0'

  const classBySubject: Record<string, number> = {}
  const classTypesBySubject: Record<string, Record<string, number>> = {}
  const classQuestionsBySubject: Record<string, Record<string, number>> = {}

  for (const r of classResponses) {
    classBySubject[r.subjectName] = (classBySubject[r.subjectName] || 0) + 1
    if (!classQuestionsBySubject[r.subjectName]) classQuestionsBySubject[r.subjectName] = {}
    classQuestionsBySubject[r.subjectName][String(r.questionNo)] =
      (classQuestionsBySubject[r.subjectName][String(r.questionNo)] || 0) + 1
    for (const id of r.subjectIds) {
      const item = getSubjectById(id)
      if (item) {
        if (!classTypesBySubject[r.subjectName]) classTypesBySubject[r.subjectName] = {}
        classTypesBySubject[r.subjectName][item.minor] = (classTypesBySubject[r.subjectName][item.minor] || 0) + 1
      }
    }
  }

  const subjects = ['전체', ...Object.keys(classBySubject).sort()]
  const subjectEntries = Object.entries(classBySubject).sort(([, a], [, b]) => b - a)
  const maxSubject = subjectEntries[0]?.[1] || 1

  const filteredTypes = (() => {
    if (classFilter === '전체') {
      const merged: Record<string, number> = {}
      for (const types of Object.values(classTypesBySubject)) {
        for (const [k, v] of Object.entries(types)) merged[k] = (merged[k] || 0) + v
      }
      return Object.entries(merged).sort(([, a], [, b]) => b - a).slice(0, 5)
    }
    return Object.entries(classTypesBySubject[classFilter] || {}).sort(([, a], [, b]) => b - a).slice(0, 5)
  })()

  const filteredQuestions = (() => {
    if (classFilter === '전체') {
      return Object.entries(classQuestionsBySubject).flatMap(([subject, qs]) =>
        Object.entries(qs).map(([qNo, count]) => ({ subject, questionNo: parseInt(qNo), count }))
      ).sort((a, b) => b.count - a.count).slice(0, 5)
    }
    return Object.entries(classQuestionsBySubject[classFilter] || {})
      .map(([qNo, count]) => ({ subject: classFilter, questionNo: parseInt(qNo), count }))
      .sort((a, b) => b.count - a.count).slice(0, 5)
  })()

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <button onClick={onBack} className="text-sm text-text-secondary mb-4">&larr; 반 목록으로</button>
      <h2 className="font-extrabold text-xl mb-4">{classNo}반</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card text-center py-3">
          <div className="text-xl font-extrabold text-primary">{submitted}<span className="text-sm text-muted font-normal"> / {classStudents.length}</span></div>
          <div className="text-xs text-text-secondary mt-0.5">입력 완료</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-xl font-extrabold text-foreground">{avgWrong}</div>
          <div className="text-xs text-text-secondary mt-0.5">평균 오답</div>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="font-bold text-sm mb-2">과목별 오답 분포</h3>
        <div className="space-y-1.5">
          {subjectEntries.map(([subject, count]) => (
            <div key={subject} className="flex items-center gap-2">
              <span className="text-xs font-medium w-16 shrink-0 truncate">{subject}</span>
              <div className="flex-1 h-4 bg-background overflow-hidden" style={{ borderRadius: '4px' }}>
                <div className="h-full bg-primary/60" style={{ width: `${(count / maxSubject) * 100}%`, borderRadius: '4px', minWidth: '12px' }} />
              </div>
              <span className="text-xs font-bold w-5 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setClassFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold transition-all active:scale-95
              ${classFilter === s ? 'bg-primary text-white' : 'bg-card text-text-secondary border border-border'}`}
            style={{ borderRadius: '18px' }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="font-bold text-sm mb-2">가장 많이 틀린 문제</h3>
          <div className="space-y-1.5">
            {filteredQuestions.length === 0 ? (
              <p className="text-sm text-muted">데이터 없음</p>
            ) : filteredQuestions.map((q, i) => (
              <div key={`${q.subject}_${q.questionNo}`} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-xs font-bold text-primary mr-1">{i + 1}</span>
                  <span>{q.subject} {q.questionNo}번</span>
                </div>
                <span className="text-xs text-text-secondary">{q.count}명</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold text-sm mb-2">취약 유형 TOP 5</h3>
          <div className="space-y-1.5">
            {filteredTypes.length === 0 ? (
              <p className="text-sm text-muted">데이터 없음</p>
            ) : filteredTypes.map(([type, count], i) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-xs font-bold text-primary mr-1.5">{i + 1}</span>
                  <span>{type}</span>
                </div>
                <span className="text-text-secondary text-xs">{count}건</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-sm mb-2">학생 목록</h3>
        <div className="space-y-0.5">
          {classStudents.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">등록된 학생이 없습니다</p>
          ) : classStudents.map((u) => (
            <button
              key={u.email}
              onClick={() => onStudentClick(u.email)}
              className="w-full flex items-center justify-between text-sm px-3 py-2.5 hover:bg-background transition-colors text-left border-b border-border last:border-0"
            >
              <span className="font-medium">{u.id} {u.name}</span>
              <span className={`text-xs ${u.wrongCount > 0 ? 'text-text-secondary' : 'text-danger font-medium'}`}>
                {u.wrongCount > 0 ? `오답 ${u.wrongCount}개` : '미입력'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SubjectFilterToggle({ subjects, active, onSelect }: { subjects: string[]; active: string; onSelect: (s: string) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-2"
      >
        과목 필터
        <span className="text-xs text-primary font-medium ml-1">{active}</span>
        <svg className={`w-3.5 h-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => onSelect(s)}
              className={`px-3 py-1.5 text-xs font-semibold transition-all active:scale-95
                ${active === s ? 'bg-primary text-white' : 'bg-card text-text-secondary border border-border'}`}
              style={{ borderRadius: '18px' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeacherDashboard() {
  const [exam, setExam] = useState(getCurrentExam)
  const pastExams = useMemo(() => getPastExams(), [])
  const [data, setData] = useState<ClassResponse[]>([])
  const [users, setUsers] = useState<{ email: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [studentDetail, setStudentDetail] = useState<{
    responses: ClassResponse[]
    plans: { subjectName: string; questionNo: number; rank: number; goal: string; textbook: string; hours: string; period: string; notes: string; learnings: string }[]
    schedule: unknown
    reflection: Record<string, string> | null
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      gasGetClassResponses(exam.examId).catch(() => []),
      gasGetAllUsers().catch(() => []),
    ]).then(([responses, allUsers]) => {
      setData(responses || [])
      setUsers(allUsers || [])
    }).finally(() => setLoading(false))
  }, [exam.examId])

  const stats = useMemo(() => {
    if (data.length === 0 && users.length === 0) return null

    const wrongByEmail: Record<string, number> = {}
    const bySubject: Record<string, number> = {}
    const typeBySubject: Record<string, Record<string, number>> = {}
    const questionBySubject: Record<string, Record<string, number>> = {}
    const byMajor: Record<string, Record<string, number>> = {}

    for (const r of data) {
      wrongByEmail[r.email] = (wrongByEmail[r.email] || 0) + 1
      bySubject[r.subjectName] = (bySubject[r.subjectName] || 0) + 1

      if (!questionBySubject[r.subjectName]) questionBySubject[r.subjectName] = {}
      questionBySubject[r.subjectName][String(r.questionNo)] =
        (questionBySubject[r.subjectName][String(r.questionNo)] || 0) + 1

      for (const id of r.subjectIds) {
        const item = getSubjectById(id)
        if (item) {
          if (!typeBySubject[r.subjectName]) typeBySubject[r.subjectName] = {}
          typeBySubject[r.subjectName][item.minor] = (typeBySubject[r.subjectName][item.minor] || 0) + 1
          const group = item.subjectGroup
          if (!byMajor[group]) byMajor[group] = {}
          byMajor[group][item.major] = (byMajor[group][item.major] || 0) + 1
        }
      }
    }

    const userList: UserInfo[] = users
      .filter((u) => u.email.split('@')[0].match(/^\d{5}$/))
      .map((u) => ({
        email: u.email,
        name: u.name || '',
        id: u.email.split('@')[0],
        wrongCount: wrongByEmail[u.email] || 0,
      }))

    const allSubjectOrder = [
      '국어', '수학', '확률과 통계', '미적분', '기하', '영어', '한국사',
      '생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '정치와 법', '경제', '사회문화',
      '물리학 I', '화학 I', '생명과학 I', '지구과학  I', '물리학 II', '화학 II', '생명과학 II', '지구과학 II',
    ]
    const subjects = ['전체', ...allSubjectOrder]

    const subjectRadars = Object.entries(byMajor)
      .filter(([, majors]) => Object.keys(majors).length >= 3)
      .map(([group, majors]) => ({
        subject: group,
        labels: Object.keys(majors),
        values: Object.values(majors),
        max: Math.max(...Object.values(majors), 1),
      }))

    const submittedCount = new Set(data.map((d) => d.email)).size

    return { userList, subjects, bySubject, typeBySubject, questionBySubject, subjectRadars, submittedCount }
  }, [data, users])

  const filteredTypes = useMemo(() => {
    if (!stats) return []
    if (subjectFilter === '전체') {
      const merged: Record<string, number> = {}
      for (const types of Object.values(stats.typeBySubject)) {
        for (const [k, v] of Object.entries(types)) merged[k] = (merged[k] || 0) + v
      }
      return Object.entries(merged).sort(([, a], [, b]) => b - a).slice(0, 10)
    }
    return Object.entries(stats.typeBySubject[subjectFilter] || {}).sort(([, a], [, b]) => b - a).slice(0, 10)
  }, [stats, subjectFilter])

  const filteredQuestions = useMemo(() => {
    if (!stats) return []
    if (subjectFilter === '전체') {
      const all: { subject: string; questionNo: number; count: number }[] = []
      for (const [subject, questions] of Object.entries(stats.questionBySubject)) {
        for (const [qNo, count] of Object.entries(questions)) {
          all.push({ subject, questionNo: parseInt(qNo), count })
        }
      }
      return all.sort((a, b) => b.count - a.count).slice(0, 10)
    }
    return Object.entries(stats.questionBySubject[subjectFilter] || {})
      .map(([qNo, count]) => ({ subject: subjectFilter, questionNo: parseInt(qNo), count }))
      .sort((a, b) => b.count - a.count).slice(0, 10)
  }, [stats, subjectFilter])

  const maxTypeCount = filteredTypes[0]?.[1] || 1

  const searchResults = useMemo(() => {
    if (!stats || !searchQuery.trim()) return []
    const q = searchQuery.trim().toLowerCase()
    return stats.userList.filter((u) =>
      u.id.includes(q) || u.name.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [stats, searchQuery])

  const loadStudentDetail = async (email: string) => {
    setSelectedStudent(email)
    setDetailLoading(true)
    try {
      const responses = data.filter((r) => r.email === email)
      const [plans, schedule, reflection] = await Promise.all([
        gasGetPlans(email, exam.examId).catch(() => []),
        gasGetSchedule(email).catch(() => null),
        gasGetReflection(email, exam.examId).catch(() => null),
      ])
      setStudentDetail({ responses, plans: plans || [], schedule, reflection })
    } catch {
      setStudentDetail(null)
    }
    setDetailLoading(false)
  }

  if (selectedClass !== null) {
    return <ClassView
      classNo={selectedClass}
      data={data}
      userList={stats?.userList || []}
      onBack={() => setSelectedClass(null)}
      onStudentClick={(email) => { loadStudentDetail(email); setSelectedClass(null) }}
    />
  }

  if (selectedStudent) {
    const info = stats?.userList.find((u) => u.email === selectedStudent)
    return <StudentDetailView
      info={info}
      exam={exam}
      detail={studentDetail}
      loading={detailLoading}
      onBack={() => { setSelectedStudent(null); setStudentDetail(null) }}
    />
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-extrabold text-xl">학생 오답 현황</h2>
        <select
          value={exam.examId}
          onChange={(e) => {
            const found = pastExams.find((ex) => ex.examId === e.target.value)
            if (found) setExam(found)
          }}
          className="text-sm border border-border bg-card px-3 py-2"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {pastExams.map((e) => (
            <option key={e.examId} value={e.examId}>{e.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner text="학생 데이터 불러오는 중" />
      ) : !stats ? (
        <div className="card py-16 text-center">
          <p className="text-text-secondary font-medium">아직 제출된 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_2fr] gap-4">
          <div className="card flex flex-col items-center justify-center py-5">
            <div className="text-3xl font-extrabold text-primary">{stats.submittedCount}<span className="text-lg text-muted font-normal"> / 361</span></div>
            <div className="text-sm text-text-secondary mt-1">입력 완료</div>
          </div>

          <div className="card relative">
            <h3 className="font-bold text-sm mb-2">개별 학생 조회</h3>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="학번 또는 이름으로 검색"
              className="w-full text-sm px-3 py-2.5 bg-white border border-border outline-none focus:border-primary transition-colors placeholder:text-muted"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border shadow-[var(--shadow-lg)] z-10 max-h-60 overflow-auto"
                   style={{ borderRadius: 'var(--radius-sm)' }}>
                {searchResults.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => { loadStudentDetail(u.email); setSearchQuery('') }}
                    className="w-full flex items-center justify-between text-sm px-3 py-2.5 hover:bg-background transition-colors text-left border-b border-border last:border-0"
                  >
                    <span className="font-medium">{u.id} {u.name}</span>
                    <span className="text-text-secondary text-xs">{u.wrongCount > 0 ? `${u.wrongCount}개` : '미입력'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-sm mb-2">반별 조회</h3>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedClass(c)}
                  className="py-2 text-sm font-semibold bg-background hover:bg-primary hover:text-white transition-all active:scale-95"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  {c}반
                </button>
              ))}
            </div>
          </div>

          <SubjectFilterToggle
            subjects={stats.subjects}
            active={subjectFilter}
            onSelect={setSubjectFilter}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-bold text-sm mb-3">가장 많이 틀린 문제</h3>
              <div className="space-y-1.5">
                {filteredQuestions.length === 0 ? (
                  <p className="text-sm text-muted">아직 응시한 학생이 없습니다</p>
                ) : filteredQuestions.map((q, i) => (
                  <div key={`${q.subject}_${q.questionNo}`} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-xs font-bold text-primary mr-1.5">{i + 1}</span>
                      <span className="font-medium">{q.subject} {q.questionNo}번</span>
                    </div>
                    <span className="text-text-secondary">{q.count}명</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-sm mb-3">취약 유형 TOP {filteredTypes.length}</h3>
              <div className="space-y-2">
                {filteredTypes.length === 0 ? (
                  <p className="text-sm text-muted">아직 응시한 학생이 없습니다</p>
                ) : (() => {
                  let currentRank = 1
                  return filteredTypes.map(([type, count], i) => {
                    if (i > 0 && count < filteredTypes[i - 1][1]) currentRank = i + 1
                    const rank = (i === 0 || count < filteredTypes[i - 1][1]) ? currentRank : null
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary w-5 shrink-0 text-center">{rank ?? ''}</span>
                        <span className="text-sm flex-1 min-w-0 truncate">{type}</span>
                        <div className="w-20 h-4 bg-background overflow-hidden shrink-0" style={{ borderRadius: '4px' }}>
                          <div className="h-full bg-primary/60" style={{ width: `${(count / maxTypeCount) * 100}%`, borderRadius: '4px', minWidth: '12px' }} />
                        </div>
                        <span className="text-xs font-bold text-text-secondary w-5 text-right shrink-0">{count}</span>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>

          {stats.subjectRadars.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {stats.subjectRadars.map(({ subject, labels, values, max }) => (
                <div key={subject} className="card p-3">
                  <h3 className="font-bold text-xs text-center mb-1">{subject} 약점 분포</h3>
                  <RadarChart labels={labels} values={values} maxValue={max} />
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { getCurrentExam, getPastExams } from '@/lib/exams'
import { getSubjectById } from '@/lib/subjects'
import { WrongAnswer } from '@/types'
import CalendarPicker from '@/components/CalendarPicker'
import { useSession } from 'next-auth/react'
import { isGasConnected, gasSavePlans, gasSaveSchedule, gasSaveReflection } from '@/lib/gas'
import { queueSync } from '@/lib/sync'

interface PlanData {
  rank: number
  textbook: string
  hours: string
  goal: string
  period: string
  notes: string
  learnings: string
}

interface WrongWithPlan {
  subject: string
  questionNo: number
  types: { id: number; major: string; middle: string; minor: string }[]
  plan: PlanData
}

function loadResponses(examId: string): WrongAnswer[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(`responses_${examId}`)
  return raw ? JSON.parse(raw) : []
}

function loadPlanData(examId: string): Record<string, PlanData> {
  if (typeof window === 'undefined') return {}
  const raw = localStorage.getItem(`plandata_${examId}`)
  return raw ? JSON.parse(raw) : {}
}

function savePlanData(examId: string, data: Record<string, PlanData>) {
  localStorage.setItem(`plandata_${examId}`, JSON.stringify(data))
}

const emptyPlan: PlanData = { rank: 0, textbook: '', hours: '', goal: '', period: '', notes: '', learnings: '' }

function getPastValues(field: string): string[] {
  if (typeof window === 'undefined') return []
  const values = new Set<string>()
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('plandata_')) {
      try {
        const data = JSON.parse(localStorage.getItem(k)!) as Record<string, PlanData>
        for (const p of Object.values(data)) {
          const v = (p as unknown as Record<string, string>)[field]
          if (v) values.add(v)
        }
      } catch { /* ignore */ }
    }
  }
  return [...values]
}

function CollapsibleGuide({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary"
      >
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        작성요령
      </button>
      {open && (
        <div className="card p-3 mt-2 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

function PlanTab() {
  const { data: session } = useSession()
  const [exam, setExam] = useState(getCurrentExam)
  const pastExams = useMemo(() => getPastExams(), [])
  const responses = useMemo(() => loadResponses(exam.examId), [exam.examId])
  const [planMap, setPlanMap] = useState<Record<string, PlanData>>(() => loadPlanData(exam.examId))
  const [editingKey, setEditingKey] = useState<string | null>(null)

  useEffect(() => {
    setPlanMap(loadPlanData(exam.examId))
  }, [exam.examId])

  useEffect(() => {
    savePlanData(exam.examId, planMap)
  }, [planMap, exam.examId])

  const handleSavePlanToGas = () => {
    if (isGasConnected() && session?.user?.email) {
      const email = session.user.email
      const examId = exam.examId
      const plans = Object.entries(planMap).map(([key, p]) => {
        const [subjectName, qStr] = key.split('_')
        return { subjectName, questionNo: parseInt(qStr), ...p }
      })
      queueSync(() => gasSavePlans(email, examId, plans))
    }
  }

  const wrongItems: WrongWithPlan[] = useMemo(() => {
    return responses.map((wa) => {
      const key = `${wa.subjectName}_${wa.questionNo}`
      const types = wa.subjectIds.map((id) => {
        const item = getSubjectById(id)
        return item
          ? { id: item.id, major: item.major, middle: item.middle, minor: item.minor }
          : { id, major: '', middle: '', minor: '알 수 없음' }
      })
      return {
        subject: wa.subjectName,
        questionNo: wa.questionNo,
        types,
        plan: planMap[key] || { ...emptyPlan },
      }
    }).sort((a, b) => {
      const ar = a.plan.rank || 9999
      const br = b.plan.rank || 9999
      return ar - br
    })
  }, [responses, planMap])

  const subjects = useMemo(() => {
    const set = new Set(wrongItems.map((w) => w.subject))
    return [...set]
  }, [wrongItems])

  const [activeSubject, setActiveSubject] = useState<string | null>(null)

  useEffect(() => {
    if (subjects.length > 0 && !activeSubject) setActiveSubject(subjects[0])
  }, [subjects, activeSubject])

  const filtered = useMemo(
    () => activeSubject ? wrongItems.filter((w) => w.subject === activeSubject) : wrongItems,
    [wrongItems, activeSubject]
  )

  const updatePlan = (key: string, field: string, value: string) => {
    setPlanMap((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || emptyPlan), [field]: field === 'rank' ? (parseInt(value) || 0) : value },
    }))
  }

  if (responses.length === 0) {
    return (
      <div className="p-5 max-w-lg mx-auto text-center py-20 animate-fade-in">
          <p className="text-text-secondary font-medium">오답 데이터가 없습니다</p>
        <p className="text-muted text-sm mt-1">먼저 오답 입력을 완료해주세요</p>
      </div>
    )
  }

  const editingItem = editingKey ? wrongItems.find((w) => `${w.subject}_${w.questionNo}` === editingKey) : null

  if (editingItem) {
    const key = editingKey!
    const plan = planMap[key] || { ...emptyPlan }
    const inputCls = "w-full text-sm px-2.5 py-1.5 bg-white border border-border outline-none focus:border-primary transition-colors placeholder:text-muted"
    const labelCls = "text-xs font-bold text-text-secondary block mb-0.5"
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setEditingKey(null)} className="text-sm text-text-secondary">
            &larr; 돌아가기
          </button>
          <button onClick={() => { setEditingKey(null); handleSavePlanToGas() }} className="btn btn-primary text-xs py-1.5 px-4">완료</button>
        </div>

        <div className="card p-5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-1 pb-2" style={{ borderBottom: '2px solid var(--primary)' }}>
            <span className="text-sm font-bold text-primary">{editingItem.subject}</span>
            <span className="font-extrabold text-lg">{editingItem.questionNo}번</span>
          </div>

          <div className="py-2 space-y-0.5" style={{ borderBottom: '1px solid var(--border)' }}>
            {editingItem.types.map((t) => (
              <div key={t.id} className="text-xs text-text-secondary">
                {t.major} &rsaquo; {t.middle} &rsaquo; <span className="font-semibold text-foreground">{t.minor}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 space-y-2.5">
            <div>
              <label className={labelCls}>우선순위</label>
              <div className="flex flex-wrap gap-1.5">
                {wrongItems
                  .filter((w) => w.subject === editingItem.subject)
                  .map((w, i) => {
                    const wKey = `${w.subject}_${w.questionNo}`
                    const wPlan = planMap[wKey]
                    const wRank = wPlan?.rank || 0
                    const isThis = wKey === key
                    const currentRank = plan.rank || 0
                    return (
                      <button
                        key={wKey}
                        onClick={() => {
                          const targetRank = i + 1
                          if (currentRank === targetRank) return
                          const sameSubjectKeys = wrongItems
                            .filter((x) => x.subject === editingItem.subject)
                            .map((x) => `${x.subject}_${x.questionNo}`)
                          setPlanMap((prev) => {
                            const next = { ...prev }
                            for (const sk of sameSubjectKeys) {
                              const p = next[sk]
                              if (p && p.rank === targetRank) {
                                next[sk] = { ...p, rank: currentRank || 0 }
                              }
                            }
                            next[key] = { ...(next[key] || emptyPlan), ...plan, rank: targetRank }
                            return next
                          })
                        }}
                        className={`w-8 h-8 flex items-center justify-center text-xs font-bold
                          transition-all active:scale-90
                          ${isThis && currentRank === i + 1
                            ? 'bg-primary text-white'
                            : wRank === i + 1
                              ? 'bg-primary-light text-primary-dark'
                              : 'bg-white border border-border text-text-secondary'
                          }`}
                        style={{ borderRadius: '6px' }}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: 'textbook', label: '교재', placeholder: 'EBS 문제은행', suggest: true },
                { key: 'hours', label: '투입시간', placeholder: '하루에 2시간씩 2주 특집', suggest: true },
                { key: 'goal', label: '목표', placeholder: '3월 모의고사 관련문제 다 맞기', suggest: true },
                { key: 'period', label: '기간', placeholder: '', suggest: false, calendar: true },
              ].map(({ key: field, label, placeholder, suggest, calendar }) => {
                const pastVals = suggest ? getPastValues(field) : []
                return (
                  <div key={field}>
                    <label className={labelCls}>{label}</label>
                    {calendar ? (
                      <CalendarPicker
                        value={plan.period}
                        onChange={(v) => updatePlan(key, 'period', v)}
                      />
                    ) : (
                      <>
                        <input
                          list={suggest ? `dl_${field}` : undefined}
                          value={(plan as unknown as Record<string, string>)[field] || ''}
                          onChange={(e) => updatePlan(key, field, e.target.value)}
                          placeholder={placeholder}
                          className={inputCls}
                          style={{ borderRadius: '6px' }}
                        />
                        {suggest && pastVals.length > 0 && (
                          <datalist id={`dl_${field}`}>
                            {pastVals.map((v) => <option key={v} value={v} />)}
                          </datalist>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <div>
              <label className={labelCls}>기타</label>
              <input
                value={plan.notes}
                onChange={(e) => updatePlan(key, 'notes', e.target.value)}
                placeholder="기타 메모"
                className={inputCls}
                style={{ borderRadius: '6px' }}
              />
            </div>

            <div>
              <label className={labelCls}>기억해야 할 것</label>
              <textarea
                value={plan.learnings}
                onChange={(e) => updatePlan(key, 'learnings', e.target.value)}
                placeholder="한 단락만 집중해서 읽다보니 다른 단락에 숨어있는 정보를 놓쳐 틀림"
                rows={2}
                className={`${inputCls} resize-none`}
                style={{ borderRadius: '6px' }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => { setEditingKey(null); handleSavePlanToGas() }}
          className="btn btn-primary w-full py-3 mt-3"
        >
          완료
        </button>
      </div>
    )
  }

  return (
    <div className="p-5 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-extrabold text-xl text-foreground">약점 보완 계획서</h2>
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

      <CollapsibleGuide>
        <ol className="text-xs text-text-secondary space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>약점을 보완하기 위한 계획을 최대한 자세하게 쓸 것.</li>
          <li>약점을 보완하기 위해 프린트물, 인강, 교과서, EBS 교재 등을 쓸 것. 두 개 이상이어도 좋음.</li>
          <li>그 약점을 보완하기 위해 투자하는 시간을 주 단위나, 월 단위로 쓸 것. (예: 1주일에 4시간, 1달에 18시간 등)</li>
          <li>전체적인 등급은 가급적 지양하고, 약점 부분과 관련한 최소한의 목표를 쓸 것. (예: 고전운문 가사와 관련된 것 다 맞기, 표현상의 특징 문제 안 틀리기 등)</li>
          <li>약점을 보완할 작업 기간을 설정할 것.</li>
          <li>기타 약점을 보완할 계획과 관련된 메모를 할 것. (선택사항)</li>
          <li className="font-semibold text-foreground">약점 보완 작업을 하면서 새롭게 알게 된 것, 미처 몰랐던 것 등을 쓸 것. (이것이 가장 중요)</li>
        </ol>
      </CollapsibleGuide>

      <div className="flex gap-2 overflow-x-auto scrollbar-none mb-4">
        {subjects.map((s) => {
          const count = wrongItems.filter((w) => w.subject === s).length
          return (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              className={`shrink-0 px-4 py-2 text-sm font-semibold transition-all active:scale-95
                ${activeSubject === s ? 'bg-primary text-white' : 'bg-card text-text-secondary border border-border'}`}
              style={{ borderRadius: '22px' }}
            >
              {s} <span className={activeSubject === s ? 'text-white/70' : 'text-muted'}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((item) => {
          const key = `${item.subject}_${item.questionNo}`
          const hasPlan = item.plan.rank > 0 || item.plan.goal || item.plan.textbook
          const details = [
            item.plan.goal && ['목표', item.plan.goal],
            item.plan.textbook && ['교재', item.plan.textbook],
            item.plan.hours && ['시간', item.plan.hours],
            item.plan.period && ['기간', item.plan.period],
          ].filter(Boolean) as [string, string][]
          return (
            <div
              key={key}
              onClick={() => setEditingKey(key)}
              className="card p-3.5 cursor-pointer active:scale-[0.99] transition-all duration-150"
              style={{ borderTop: `3px solid ${hasPlan ? 'var(--primary)' : 'var(--border)'}` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm">{item.questionNo}번</span>
                  {item.plan.rank > 0 && (
                    <span className="badge badge-primary text-[0.6rem]">{item.plan.rank}순위</span>
                  )}
                </div>
                <span className="text-muted text-xs">{hasPlan ? '수정' : '작성'} &rsaquo;</span>
              </div>

              <div className="space-y-0.5 mb-2">
                {item.types.map((t) => (
                  <div key={t.id} className="text-sm text-text-secondary">
                    {t.major} &rsaquo; <span className="font-semibold text-foreground">{t.minor}</span>
                  </div>
                ))}
              </div>

              {details.length > 0 && (
                <div className="pt-2 space-y-1 text-sm" style={{ borderTop: '1px dashed var(--border)' }}>
                  {details.map(([label, val]) => (
                    <div key={label}>
                      <span className="font-semibold text-foreground">{label}</span>{' '}
                      <span className="text-text-secondary">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {item.plan.learnings && (
                <div className="mt-2 pt-2 text-sm text-text-secondary" style={{ borderTop: '1px dashed var(--border)' }}>
                  <span className="font-semibold text-foreground">메모</span> {item.plan.learnings.slice(0, 50)}{item.plan.learnings.length > 50 ? '...' : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// === 시간표 탭 ===

interface ScheduleCell {
  subject: string
  detail: string
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri'
const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: '월' }, { key: 'tue', label: '화' }, { key: 'wed', label: '수' },
  { key: 'thu', label: '목' }, { key: 'fri', label: '금' },
]
const TIME_SLOTS = ['ET1', 'ET2', 'EP1-1', 'EP1-2', 'EP2-1', 'EP2-2']

function loadSchedule(): Record<string, Record<string, ScheduleCell>> {
  if (typeof window === 'undefined') return {}
  const raw = localStorage.getItem('schedule')
  return raw ? JSON.parse(raw) : {}
}

function saveSchedule(data: Record<string, Record<string, ScheduleCell>>) {
  localStorage.setItem('schedule', JSON.stringify(data))
}

function ScheduleTab() {
  const { data: session } = useSession()
  const [schedule, setSchedule] = useState<Record<string, Record<string, ScheduleCell>>>(() => loadSchedule())
  const [editing, setEditing] = useState<{ slot: string; day: string } | null>(null)
  const [weekendSlots, setWeekendSlots] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['오전 1', '오전 2', '오후 1', '오후 2']
    const saved = localStorage.getItem('weekendSlots')
    return saved ? JSON.parse(saved) : ['오전 1', '오전 2', '오후 1', '오후 2']
  })

  useEffect(() => { saveSchedule(schedule) }, [schedule])
  useEffect(() => { localStorage.setItem('weekendSlots', JSON.stringify(weekendSlots)) }, [weekendSlots])

  const handleSaveSchedule = () => {
    if (isGasConnected() && session?.user?.email) {
      queueSync(() => gasSaveSchedule(session!.user!.email!, schedule, weekendSlots))
    }
  }

  const getCell = (slot: string, day: string): ScheduleCell => schedule[slot]?.[day] || { subject: '', detail: '' }

  const updateCell = (slot: string, day: string, cell: ScheduleCell) => {
    setSchedule((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], [day]: cell },
    }))
  }

  const addWeekendSlot = () => {
    setWeekendSlots((prev) => [...prev, `시간 ${prev.length + 1}`])
  }

  const removeWeekendSlot = (idx: number) => {
    const slot = weekendSlots[idx]
    setWeekendSlots((prev) => prev.filter((_, i) => i !== idx))
    setSchedule((prev) => {
      const next = { ...prev }
      delete next[`we_${slot}`]
      return next
    })
  }

  const renameWeekendSlot = (idx: number, name: string) => {
    const oldName = weekendSlots[idx]
    setWeekendSlots((prev) => prev.map((s, i) => i === idx ? name : s))
    if (oldName !== name) {
      setSchedule((prev) => {
        const next = { ...prev }
        const oldKey = `we_${oldName}`
        const newKey = `we_${name}`
        if (next[oldKey]) {
          next[newKey] = next[oldKey]
          delete next[oldKey]
        }
        return next
      })
    }
  }

  const renderTable = (
    title: string,
    cols: { key: string; label: string }[],
    slots: string[],
    slotPrefix?: string
  ) => (
    <div>
      <table className="w-full text-sm border-collapse" style={{ borderRadius: 'var(--radius-sm)' }}>
        <thead>
          <tr>
            <th className="text-xs text-white font-bold p-2 border border-primary/20 bg-primary w-16">시간</th>
            {cols.map((c) => (
              <th key={c.key} className="text-xs text-white font-bold p-2 border border-primary/20 bg-primary">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const sKey = slotPrefix ? `${slotPrefix}_${slot}` : slot
            return (
              <tr key={sKey}>
                <td className="text-xs font-bold text-text-secondary p-2 border border-border bg-primary-light/30 text-center">{slot}</td>
                {cols.map((c) => {
                  const cell = getCell(sKey, c.key)
                  const isEd = editing?.slot === sKey && editing?.day === c.key
                  return (
                    <td
                      key={c.key}
                      className="border border-border p-1 min-w-[80px] h-12 align-middle text-center cursor-pointer bg-white hover:bg-primary-light/20 transition-colors"
                      onClick={() => setEditing({ slot: sKey, day: c.key })}
                    >
                      {isEd ? (
                        <input
                          autoFocus
                          value={cell.subject}
                          onChange={(e) => updateCell(sKey, c.key, { ...cell, subject: e.target.value })}
                          onBlur={() => setEditing(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                          placeholder="과목(상세)"
                          className="w-full text-xs bg-transparent outline-none border-b border-primary text-center"
                        />
                      ) : (
                        <span className={`text-xs ${cell.subject ? 'text-foreground font-medium' : 'text-muted'}`}>
                          {cell.subject || ''}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const WEEKDAY_COLS = DAYS.map((d) => ({ key: d.key, label: d.label }))
  const WEEKEND_COLS = [{ key: 'sat', label: '토요일' }, { key: 'sun', label: '일요일' }]

  return (
    <div className="p-4 max-w-4xl mx-auto animate-fade-in space-y-6">
      <h2 className="font-extrabold text-lg">수능 공부 시간표</h2>

      <CollapsibleGuide>
        <ol className="text-xs text-text-secondary space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>앞에서 작성한 각 약점 리스트를 분석한 후 평일에 수능을 위해 공부해야 할 과목을 정규수업 수강신청 하듯이 계획하시오.</li>
          <li>단순히 국어, 영어, 수학, 탐구를 분배하는 것이 아니라 분석한 약점에 따라 국어(고전운문), 영어(빈칸 추론) 등 구체적으로 시간표를 작성하시오.</li>
          <li>평일 시간은 기숙사 혹은 EP2까지 하는 학생들을 위해 임의로 담임이 시간을 나눈 것이므로 자신의 상황에 맞게 시간을 조절하되, 한 공부 당 50분은 넘지 않도록 하시오.</li>
          <li>주말 시간은 휴식과 재충전을 고려하여 자유롭게 구성하되, 수능을 위해서라면 특정 영역의 모의고사 문제를 실제 시험 시간에 맞춰 공부하도록 설계하시오.</li>
          <li>위 시간표를 알맞게 변형하여 내신 공부 계획에 활용할 수 있음.</li>
        </ol>
      </CollapsibleGuide>

      <div>
        <h3 className="font-bold text-sm mb-2">평일</h3>
        <div>{renderTable('평일', WEEKDAY_COLS, TIME_SLOTS)}</div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">주말</h3>
          <button onClick={addWeekendSlot} className="text-xs text-primary font-medium">+ 시간대 추가</button>
        </div>
        <div>
          <table className="w-full text-sm border-collapse" style={{ borderRadius: 'var(--radius-sm)' }}>
            <thead>
              <tr>
                <th className="text-xs text-white font-bold p-2 border border-primary/20 bg-primary w-24">시간</th>
                {WEEKEND_COLS.map((c) => (
                  <th key={c.key} className="text-xs text-white font-bold p-2 border border-primary/20 bg-primary">{c.label}</th>
                ))}
                <th className="text-xs text-white font-bold p-1 border border-primary/20 bg-primary w-8"></th>
              </tr>
            </thead>
            <tbody>
              {weekendSlots.map((slot, idx) => {
                const sKey = `we_${slot}`
                return (
                  <tr key={idx}>
                    <td className="text-xs font-bold text-text-secondary p-1 border border-border bg-primary-light/30 text-center">
                      <input
                        value={slot}
                        onChange={(e) => renameWeekendSlot(idx, e.target.value)}
                        className="w-full text-xs text-center bg-transparent outline-none font-bold"
                      />
                    </td>
                    {WEEKEND_COLS.map((c) => {
                      const cell = getCell(sKey, c.key)
                      const isEd = editing?.slot === sKey && editing?.day === c.key
                      return (
                        <td
                          key={c.key}
                          className="border border-border p-1 min-w-[80px] h-12 align-middle text-center cursor-pointer bg-white hover:bg-primary-light/20 transition-colors"
                          onClick={() => setEditing({ slot: sKey, day: c.key })}
                        >
                          {isEd ? (
                            <input
                              autoFocus
                              value={cell.subject}
                              onChange={(e) => updateCell(sKey, c.key, { ...cell, subject: e.target.value })}
                              onBlur={() => setEditing(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                              placeholder="과목(상세)"
                              className="w-full text-xs bg-transparent outline-none border-b border-primary text-center"
                            />
                          ) : (
                            <span className={`text-xs ${cell.subject ? 'text-foreground font-medium' : 'text-muted'}`}>
                              {cell.subject || ''}
                            </span>
                          )}
                        </td>
                      )
                    })}
                    <td className="border border-border p-1 text-center bg-white">
                      <button onClick={() => removeWeekendSlot(idx)} className="text-muted hover:text-danger text-xs">&times;</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={handleSaveSchedule} className="btn btn-primary w-full py-3 mt-4">
        시간표 저장
      </button>
    </div>
  )
}

// === 성찰 탭 ===

interface ReflectionData {
  weakness: string
  newWeakness: string
  scheduleReview: string
  growth: string
}

const REFLECTION_FIELDS: { key: keyof ReflectionData; label: string; placeholder: string }[] = [
  { key: 'weakness', label: '약점 보완 관련', placeholder: '약점 보완을 위해 실행한 것, 효과가 있었는지, 부족했던 점 등' },
  { key: 'newWeakness', label: '새롭게 파악된 약점', placeholder: '이번 학평을 통해 새로 발견한 약점, 예상하지 못했던 부분 등' },
  { key: 'scheduleReview', label: '시간표 구성의 적절성', placeholder: '시간 배분이 적절했는지, 조정이 필요한 부분, 다음에 바꿀 점 등' },
  { key: 'growth', label: '기타 수능 공부의 성장을 이야기할 수 있는 부분', placeholder: '공부 습관의 변화, 멘탈 관리, 새로 시도한 방법 등' },
]

const emptyReflection: ReflectionData = { weakness: '', newWeakness: '', scheduleReview: '', growth: '' }

function loadReflection(examId: string): ReflectionData {
  if (typeof window === 'undefined') return emptyReflection
  const raw = localStorage.getItem(`reflection_${examId}`)
  return raw ? { ...emptyReflection, ...JSON.parse(raw) } : emptyReflection
}

function saveReflection(examId: string, data: ReflectionData) {
  localStorage.setItem(`reflection_${examId}`, JSON.stringify(data))
}

function ReflectionTab() {
  const { data: session } = useSession()
  const [exam, setExam] = useState(getCurrentExam)
  const pastExams = useMemo(() => getPastExams(), [])
  const [data, setData] = useState<ReflectionData>(() => loadReflection(exam.examId))

  useEffect(() => {
    setData(loadReflection(exam.examId))
  }, [exam.examId])

  useEffect(() => {
    const timer = setTimeout(() => saveReflection(exam.examId, data), 500)
    return () => clearTimeout(timer)
  }, [data, exam.examId])

  const handleSaveReflection = () => {
    saveReflection(exam.examId, data)
    if (isGasConnected() && session?.user?.email) {
      queueSync(() => gasSaveReflection(session!.user!.email!, exam.examId, data as unknown as Record<string, string>))
    }
  }

  const update = (key: keyof ReflectionData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-extrabold text-lg">수능 공부 성찰</h2>
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

      <CollapsibleGuide>
        <p className="text-xs text-text-secondary leading-relaxed">
          이전 학평 결과를 바탕으로 3개월 동안 공부한 결과를 좋았던 점, 개선해야 할 점, 느낀 점 등을 자유롭게 쓰시오. (생기부 학업능력 관련)
        </p>
      </CollapsibleGuide>

      <div className="space-y-4">
        {REFLECTION_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className="card">
            <label className="text-sm font-bold text-foreground block mb-2">{label}</label>
            <textarea
              value={data[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="w-full text-sm px-3 py-2.5 bg-white border border-border outline-none
                         focus:border-primary transition-colors placeholder:text-muted resize-none"
              style={{ borderRadius: 'var(--radius-sm)', lineHeight: '1.8' }}
            />
          </div>
        ))}
      </div>


      <button onClick={handleSaveReflection} className="btn btn-primary w-full py-3 mt-4">
        성찰 저장
      </button>
    </div>
  )
}

// === 메인 페이지: 서브탭 래퍼 ===

const SUB_TABS = [
  { key: 'plan', label: '계획서' },
  { key: 'schedule', label: '시간표' },
  { key: 'reflection', label: '성찰' },
]

export default function PlanPage() {
  const [activeTab, setActiveTab] = useState('plan')

  return (
    <div>
      <div className="flex gap-1 px-4 pt-3 pb-1 bg-card sticky top-0 z-10">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-semibold transition-all
              ${activeTab === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'plan' && <PlanTab />}
      {activeTab === 'schedule' && <ScheduleTab />}
      {activeTab === 'reflection' && <ReflectionTab />}
    </div>
  )
}

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { getCurrentExam, getPastExams } from '@/lib/exams'
import { WrongAnswer, getAvailableSubjects } from '@/types'
import { getSubjectById } from '@/lib/subjects'
import QuestionGrid from '@/components/QuestionGrid'
import TypeSelector from '@/components/TypeSelector'
import SubjectTabs from '@/components/SubjectTabs'
import PdfViewer from '@/components/PdfViewer'
import ResizableSplit from '@/components/ResizableSplit'
import { getPapers } from '@/data/papers'
import { isGasConnected, gasSaveResponses, upsertUser } from '@/lib/gas'
import { queueSync, waitForPreload } from '@/lib/sync'
import Spinner from '@/components/Spinner'
import { useSession } from 'next-auth/react'

const AUTO_SUBJECTS = ['국어', '수학', '영어', '한국사']
const QUESTION_COUNTS: Record<string, number> = {
  '국어': 45, '수학': 22, '영어': 45, '한국사': 20,
  '확률과 통계': 8, '미적분': 8, '기하': 8,
}
const DEFAULT_TAMGU_QUESTIONS = 20

interface SavedDraft {
  examId: string
  selectedMath: string | null
  selectedTamgu: string[]
  wrongMap: Record<string, [number, WrongAnswer][]>
  activeSubject: string
}

function saveDraft(examId: string, data: Omit<SavedDraft, 'examId'>) {
  const serialized: SavedDraft = {
    examId,
    selectedMath: data.selectedMath,
    selectedTamgu: data.selectedTamgu,
    wrongMap: Object.fromEntries(
      Object.entries(data.wrongMap).map(([k, v]) => [k, [...v.entries()]])
    ),
    activeSubject: data.activeSubject,
  }
  localStorage.setItem(`draft_${examId}`, JSON.stringify(serialized))
}

function loadDraft(examId: string): SavedDraft | null {
  const raw = localStorage.getItem(`draft_${examId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function ExamInputPage() {
  const { data: session } = useSession()
  const [exam, setExam] = useState(getCurrentExam)
  const pastExams = useMemo(() => getPastExams(), [])

  const [selectedMath, setSelectedMath] = useState<string | null>(null)
  const [selectedTamgu, setSelectedTamgu] = useState<string[]>([])
  const [subjectSelectionDone, setSubjectSelectionDone] = useState(false)
  const [activeSubject, setActiveSubject] = useState('')
  const [wrongMap, setWrongMap] = useState<Record<string, Map<number, WrongAnswer>>>({})
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return
    let cancelled = false

    waitForPreload().then(() => {
    if (cancelled) return
    const draft = loadDraft(exam.examId)
    if (draft && draft.selectedMath) {
      setSelectedMath(draft.selectedMath)
      setSelectedTamgu(draft.selectedTamgu)
      const restored: Record<string, Map<number, WrongAnswer>> = {}
      for (const [k, entries] of Object.entries(draft.wrongMap)) {
        restored[k] = new Map(entries)
      }
      setWrongMap(restored)
      setActiveSubject(draft.activeSubject || '')
      setSubjectSelectionDone(true)
      setLoaded(true)
      return
    }

    const saved = localStorage.getItem(`responses_${exam.examId}`)
    if (saved) {
      try {
        const responses: WrongAnswer[] = JSON.parse(saved)
        if (responses.length > 0) {
          const subjects = [...new Set(responses.map((r) => r.subjectName))]
          const mathChoice = subjects.find((s) => ['확률과 통계', '미적분', '기하'].includes(s))
          const tamgu = subjects.filter((s) =>
            !['국어', '수학', '영어', '한국사', '확률과 통계', '미적분', '기하'].includes(s)
          )
          if (mathChoice) setSelectedMath(mathChoice)
          if (tamgu.length > 0) setSelectedTamgu(tamgu)

          const map: Record<string, Map<number, WrongAnswer>> = {}
          const allSubs = ['국어', '수학', ...(mathChoice ? [mathChoice] : []), '영어', '한국사', ...tamgu]
          for (const s of allSubs) map[s] = new Map()
          for (const r of responses) {
            if (map[r.subjectName]) {
              map[r.subjectName].set(r.questionNo, r)
            }
          }
          setWrongMap(map)
          setActiveSubject(allSubs[0])
          setSubjectSelectionDone(true)
        }
      } catch { /* ignore */ }
    }
    setLoaded(true)
    })
    return () => { cancelled = true }
  }, [exam.examId, loaded])

  const available = useMemo(() => getAvailableSubjects(exam.month), [exam.month])
  const mathOptions = available.math
  const socialOptions = available.social.map((name) => ({ group: '사회탐구', name }))
  const scienceOptions = available.science.map((name) => ({ group: '과학탐구', name }))

  const allSubjects = useMemo(() => {
    const social = selectedTamgu.filter((s) => socialOptions.some((o) => o.name === s))
    const science = selectedTamgu.filter((s) => scienceOptions.some((o) => o.name === s))
    return ['국어', '수학', ...(selectedMath ? [selectedMath] : []), '영어', '한국사', ...social, ...science]
  }, [selectedMath, selectedTamgu, socialOptions, scienceOptions]
  )

  const toggleTamgu = useCallback((name: string) => {
    setSelectedTamgu((prev) =>
      prev.includes(name)
        ? prev.filter((s) => s !== name)
        : prev.length < 2
          ? [...prev, name]
          : prev
    )
  }, [])

  const canConfirm = selectedMath !== null && selectedTamgu.length === 2

  const confirmSubjects = useCallback(() => {
    if (!canConfirm) return
    setSubjectSelectionDone(true)
    setActiveSubject(allSubjects[0])
    const map: Record<string, Map<number, WrongAnswer>> = {}
    for (const s of allSubjects) map[s] = new Map()
    setWrongMap(map)
  }, [canConfirm, allSubjects])

  const getQuestionCount = useCallback((subjectName: string) => {
    return QUESTION_COUNTS[subjectName] || DEFAULT_TAMGU_QUESTIONS
  }, [])

  const toggleQuestion = useCallback((questionNo: number) => {
    setWrongMap((prev) => {
      const subjectMap = new Map(prev[activeSubject] || [])
      const existing = subjectMap.get(questionNo)
      if (existing) {
        if (existing.subjectIds.length === 0) {
          subjectMap.delete(questionNo)
          setActiveQuestion(null)
        } else {
          setActiveQuestion(questionNo)
        }
      } else {
        subjectMap.set(questionNo, { subjectName: activeSubject, questionNo, subjectIds: [] })
        setActiveQuestion(questionNo)
      }
      const next = { ...prev, [activeSubject]: subjectMap }
      saveDraft(exam.examId, { selectedMath, selectedTamgu, wrongMap: next, activeSubject })
      return next
    })
  }, [activeSubject, activeQuestion, exam.examId, selectedMath, selectedTamgu])

  const handleTypeSelect = useCallback((questionNo: number, ids: number[]) => {
    setWrongMap((prev) => {
      const subjectMap = new Map(prev[activeSubject] || [])
      const existing = subjectMap.get(questionNo)
      if (existing) subjectMap.set(questionNo, { ...existing, subjectIds: ids })
      const next = { ...prev, [activeSubject]: subjectMap }
      saveDraft(exam.examId, { selectedMath, selectedTamgu, wrongMap: next, activeSubject })
      return next
    })
    setActiveQuestion(null)
  }, [activeSubject, exam.examId, selectedMath, selectedTamgu])

  const wrongCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const [subject, map] of Object.entries(wrongMap)) counts[subject] = map.size
    return counts
  }, [wrongMap])

  const totalWrong = useMemo(
    () => Object.values(wrongCounts).reduce((a, b) => a + b, 0),
    [wrongCounts]
  )

  const allTyped = useMemo(() => {
    for (const map of Object.values(wrongMap)) {
      for (const wa of map.values()) {
        if (wa.subjectIds.length === 0) return false
      }
    }
    return totalWrong > 0
  }, [wrongMap, totalWrong])

  const handleSubmit = useCallback(async () => {
    if (saving) return
    setSaving(true)
    const responses = []
    for (const [, map] of Object.entries(wrongMap)) {
      for (const wa of map.values()) responses.push(wa)
    }
    localStorage.setItem(`responses_${exam.examId}`, JSON.stringify(responses))
    setSaving(false)
    setShowSavedModal(true)

    if (isGasConnected() && session?.user?.email) {
      const email = session.user.email
      const name = session.user.name || ''
      const examId = exam.examId
      queueSync(async () => {
        await upsertUser(email, name)
        await gasSaveResponses(email, examId, responses)
      })
    }
  }, [wrongMap, exam, session, saving])

  // === 선택 과목 화면 ===
  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Spinner text="데이터 불러오는 중" />
      </div>
    )
  }

  if (!subjectSelectionDone) {
    const selectionSummary = [
      selectedMath,
      ...selectedTamgu,
    ].filter(Boolean).join(', ')

    return (
      <div className="p-5 space-y-5 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">선택 과목</h2>
          <select
            value={exam.examId}
            onChange={(e) => {
              const found = pastExams.find((ex) => ex.examId === e.target.value)
              if (found) {
                setExam(found)
                setSelectedMath(null)
                setSelectedTamgu([])
              }
            }}
            className="text-sm border border-border bg-card px-3 py-2"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            {pastExams.map((e) => (
              <option key={e.examId} value={e.examId}>{e.name}</option>
            ))}
          </select>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-text-secondary">공통</span>
            <span className="badge badge-primary text-xs">자동 포함</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AUTO_SUBJECTS.map((s) => (
              <span
                key={s}
                className="px-4 py-2.5 text-sm font-semibold bg-primary text-white"
                style={{ borderRadius: 'var(--radius)' }}
              >
                {s} ({QUESTION_COUNTS[s]}문제)
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-text-secondary">수학 선택 <span className="text-muted font-normal">(8문제)</span></span>
            <span className="text-xs text-muted">{selectedMath ? '1/1' : '0/1'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {mathOptions.map((name) => {
              const isSelected = selectedMath === name
              return (
                <button
                  key={name}
                  onClick={() => setSelectedMath(isSelected ? null : name)}
                  className={`px-4 py-2.5 text-sm font-semibold
                             transition-all duration-200 active:scale-95
                             ${isSelected
                               ? 'bg-primary text-white'
                               : 'bg-background border border-border text-foreground'
                             }`}
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-text-secondary">사회탐구</span>
            <span className="text-xs text-muted">
              {selectedTamgu.filter((s) => socialOptions.some((o) => o.name === s)).length}개
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {socialOptions.map((item) => {
              const isSelected = selectedTamgu.includes(item.name)
              const disabled = !isSelected && selectedTamgu.length >= 2
              return (
                <button
                  key={item.name}
                  onClick={() => toggleTamgu(item.name)}
                  disabled={disabled}
                  className={`px-4 py-2.5 text-sm font-semibold
                             transition-all duration-200 active:scale-95
                             disabled:opacity-30
                             ${isSelected
                               ? 'bg-primary text-white'
                               : 'bg-background border border-border text-foreground'
                             }`}
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  {item.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-text-secondary">과학탐구</span>
            <span className="text-xs text-muted">
              {selectedTamgu.filter((s) => scienceOptions.some((o) => o.name === s)).length}개
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {scienceOptions.map((item) => {
              const isSelected = selectedTamgu.includes(item.name)
              const disabled = !isSelected && selectedTamgu.length >= 2
              return (
                <button
                  key={item.name}
                  onClick={() => toggleTamgu(item.name)}
                  disabled={disabled}
                  className={`px-4 py-2.5 text-sm font-semibold
                             transition-all duration-200 active:scale-95
                             disabled:opacity-30
                             ${isSelected
                               ? 'bg-primary text-white'
                               : 'bg-background border border-border text-foreground'
                             }`}
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  {item.name}
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={confirmSubjects}
          disabled={!canConfirm}
          className="btn btn-primary w-full py-4 text-base disabled:opacity-40"
        >
          {canConfirm
            ? `선택 완료 (국/영/한 + ${selectionSummary})`
            : `수학 1개 + 탐구 2개를 선택하세요 (${selectedTamgu.length}/2)`}
        </button>
      </div>
    )
  }

  // === 오답 입력 화면 ===
  const currentWrong = wrongMap[activeSubject] || new Map()
  const activeWa = activeQuestion ? currentWrong.get(activeQuestion) : null
  const papers = getPapers(exam.examId, activeSubject)

  const inputPanel = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4">
        <QuestionGrid
          totalQuestions={getQuestionCount(activeSubject)}
          wrongAnswers={currentWrong}
          activeQuestion={activeQuestion}
          onToggle={toggleQuestion}
        />

        {currentWrong.size > 0 && (
          <div className="mt-5 space-y-2">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide">틀린 문제 유형</h3>
            {[...currentWrong.entries()]
              .sort(([a], [b]) => a - b)
              .map(([no, wa]) => (
                <div
                  key={no}
                  onClick={() => setActiveQuestion(no)}
                  className={`px-3.5 py-3 cursor-pointer
                             active:scale-[0.99] transition-all duration-150
                             ${wa.subjectIds.length > 0
                               ? 'bg-card shadow-[var(--shadow-sm)]'
                               : 'bg-danger-light border border-danger/30'
                             }`}
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{no}번</span>
                    <span className={`text-xs font-medium ${wa.subjectIds.length > 0 ? 'badge badge-primary' : 'badge badge-danger'}`}>
                      {wa.subjectIds.length > 0 ? `${wa.subjectIds.length}개 유형` : '미선택'}
                    </span>
                  </div>
                  {wa.subjectIds.length > 0 && (
                    <div className="mt-1.5 text-[0.7rem] text-text-secondary leading-relaxed">
                      {wa.subjectIds.map((id) => getSubjectById(id)?.minor).filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {totalWrong > 0 && (
        <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
          <button
            onClick={handleSubmit}
            disabled={!allTyped || saving}
            className={`w-full py-3.5 font-bold text-base active:scale-[0.98] transition-all
                       ${allTyped && !saving ? 'btn btn-primary' : 'bg-gray-100 text-muted cursor-not-allowed'}`}
            style={{ borderRadius: 'var(--radius)' }}
          >
            {saving ? '저장 중...' : allTyped ? `총 ${totalWrong}개 오답 저장` : '유형 미선택 문제가 있습니다'}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center bg-card border-b border-border">
        <div className="flex-1 overflow-hidden">
          <SubjectTabs
            subjects={allSubjects}
            active={activeSubject}
            wrongCounts={wrongCounts}
            onSelect={(s) => { setActiveSubject(s); setActiveQuestion(null) }}
          />
        </div>
        <button
          onClick={() => { setSubjectSelectionDone(false); setActiveQuestion(null) }}
          className="shrink-0 text-xs text-muted hover:text-foreground px-3 py-2 transition-colors"
        >
          과목 변경
        </button>
      </div>

      {/* split view: 시험지 좌 + 오답 입력 우 */}
      <div className="flex-1 overflow-hidden">
        <ResizableSplit
          defaultRatio={0.5}
          minRatio={0.2}
          maxRatio={0.8}
          left={<PdfViewer papers={papers} />}
          right={
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
                <span className="text-xs font-bold text-text-secondary">오답 입력</span>
                <span className="text-xs text-text-secondary">
                  오답 <span className="text-danger font-bold">{currentWrong.size}</span>개
                </span>
              </div>
              {inputPanel}
            </div>
          }
        />
      </div>

      {activeQuestion && activeWa && (
        <TypeSelector
          subjectGroup={activeSubject === '국어' ? '국어' : activeSubject === '수학' ? '수학' : null}
          subjectName={activeSubject}
          questionNo={activeQuestion}
          selectedIds={activeWa.subjectIds}
          onSelect={(ids) => handleTypeSelect(activeQuestion, ids)}
          onClose={() => setActiveQuestion(null)}
        />
      )}

      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[rgba(15,23,42,0.5)]"
            style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={() => setShowSavedModal(false)}
          />
          <div className="relative card text-center py-8 px-10 animate-scale-in max-w-xs">
            <div className="text-4xl mb-3">&#10003;</div>
            <h3 className="font-bold text-lg mb-1">저장 완료</h3>
            <p className="text-sm text-text-secondary mb-5">
              총 {totalWrong}개 오답이 저장되었습니다
            </p>
            <button
              onClick={() => setShowSavedModal(false)}
              className="btn btn-primary w-full py-3"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

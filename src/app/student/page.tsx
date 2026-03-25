'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { getCurrentExam, getPastExams } from '@/lib/exams'
import { getSubjectById } from '@/lib/subjects'
import { WrongAnswer, SUBJECT_QUESTIONS } from '@/types'
import RadarChart from '@/components/RadarChart'
import Spinner from '@/components/Spinner'
import { waitForPreload } from '@/lib/sync'
import LineChart, { CHART_COLORS } from '@/components/LineChart'

function loadResponses(examId: string): WrongAnswer[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(`responses_${examId}`)
  return raw ? JSON.parse(raw) : []
}

function loadAllResponses(): WrongAnswer[] {
  if (typeof window === 'undefined') return []
  const all: WrongAnswer[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('responses_')) {
      try { all.push(...JSON.parse(localStorage.getItem(k)!)) } catch { /* ignore */ }
    }
  }
  return all
}

const TOTAL_Q: Record<string, number> = {
  '국어': 45, '수학': 22, '영어': 45, '한국사': 20,
}

export default function StudentDashboard() {
  const router = useRouter()
  const [selectedExamId, setSelectedExamId] = useState('all')
  const pastExams = useMemo(() => getPastExams(), [])
  const [responses, setResponses] = useState<WrongAnswer[]>([])
  const [loaded, setLoaded] = useState(false)
  const [radarModal, setRadarModal] = useState<{ subject: string; labels: string[]; values: number[]; max: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    waitForPreload().then(() => {
      if (cancelled) return
      const data = selectedExamId === 'all'
        ? loadAllResponses()
        : loadResponses(selectedExamId)
      if (data.length === 0 && selectedExamId === 'all') {
        router.replace('/student/exam')
        return
      }
      setResponses(data)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [selectedExamId, router])

  const stats = useMemo(() => {
    if (responses.length === 0) return null

    const bySubject: Record<string, number> = {}
    const byType: Record<string, number> = {}
    const subjectMajors: Record<string, Record<string, number>> = {}

    const subjectGroupMap: Record<string, string> = {}

    for (const r of responses) {
      bySubject[r.subjectName] = (bySubject[r.subjectName] || 0) + 1
      for (const id of r.subjectIds) {
        const item = getSubjectById(id)
        if (item) {
          byType[item.minor] = (byType[item.minor] || 0) + 1
          const group = item.subjectGroup
          subjectGroupMap[r.subjectName] = group
          if (!subjectMajors[group]) subjectMajors[group] = {}
          subjectMajors[group][item.major] = (subjectMajors[group][item.major] || 0) + 1
        }
      }
    }

    const topTypes = Object.entries(byType).sort(([, a], [, b]) => b - a).slice(0, 8)

    const subjectRadars = Object.entries(subjectMajors)
      .map(([group, majors]) => {
        const labels = Object.keys(majors)
        const values = labels.map((l) => majors[l])
        return { subject: group, labels, values, max: Math.max(...values, 1) }
      })

    const correctRates: Record<string, number> = {}
    for (const [subject, wrong] of Object.entries(bySubject)) {
      const total = TOTAL_Q[subject] || SUBJECT_QUESTIONS[subject] || 20
      correctRates[subject] = Math.round(((total - wrong) / total) * 100)
    }

    return { bySubject, topTypes, total: responses.length, subjectRadars, correctRates }
  }, [responses])

  const trendData = useMemo(() => {
    const examsWithData = pastExams.slice().reverse().filter((e) => loadResponses(e.examId).length > 0)
    if (examsWithData.length === 0) return null

    const xLabels = examsWithData.map((e) => e.name)
    const subjectSet = new Set<string>()
    const perExam = examsWithData.map((e) => {
      const data = loadResponses(e.examId)
      const bySubject: Record<string, number> = {}
      for (const r of data) {
        bySubject[r.subjectName] = (bySubject[r.subjectName] || 0) + 1
        subjectSet.add(r.subjectName)
      }
      return bySubject
    })

    const subjects = [...subjectSet]
    const series = subjects.map((s, i) => ({
      label: s,
      color: CHART_COLORS[i % CHART_COLORS.length],
      data: perExam.map((pe) => pe[s] || 0),
    }))

    return { xLabels, series }
  }, [pastExams])

  const repeatedWeaknesses = useMemo(() => {
    const examsWithData = pastExams.slice().reverse().filter((e) => loadResponses(e.examId).length > 0)
    if (examsWithData.length < 2) return []

    const typeCount: Record<string, number> = {}
    for (const e of examsWithData) {
      const data = loadResponses(e.examId)
      const seen = new Set<string>()
      for (const r of data) {
        for (const id of r.subjectIds) {
          const item = getSubjectById(id)
          if (item && !seen.has(item.minor)) {
            seen.add(item.minor)
            typeCount[item.minor] = (typeCount[item.minor] || 0) + 1
          }
        }
      }
    }

    return Object.entries(typeCount)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
  }, [pastExams])

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-5 text-center py-20 animate-fade-in">
        <p className="text-text-secondary font-medium">이 시험의 오답 데이터가 없습니다</p>
      </div>
    )
  }

  const maxTypeCount = stats.topTypes.length > 0 ? stats.topTypes[0][1] : 1

  return (
    <div className="p-4 space-y-4 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <select
          value={selectedExamId}
          onChange={(e) => { setSelectedExamId(e.target.value); setLoaded(false) }}
          className="text-sm font-bold border border-border bg-card px-3 py-2"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          <option value="all">전체 누적</option>
          {pastExams.map((e) => (
            <option key={e.examId} value={e.examId}>{e.name}</option>
          ))}
        </select>
        <button
          onClick={() => router.push('/student/exam')}
          className="text-xs text-primary font-medium"
        >
          오답 수정 &rsaquo;
        </button>
      </div>

      {selectedExamId === 'all' && trendData && (
        <div className="card">
          <h3 className="font-bold text-sm mb-3">과목별 오답 추이</h3>
          <LineChart xLabels={trendData.xLabels.map((l) => l.split(' ')[0])} series={trendData.series} />
        </div>
      )}

      {stats.subjectRadars.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {stats.subjectRadars.map(({ subject, labels, values, max }) => (
            <div
              key={subject}
              className="card p-2.5 cursor-pointer active:scale-[0.97] transition-transform"
              onClick={() => setRadarModal({ subject, labels, values, max })}
            >
              <h3 className="font-bold text-[0.65rem] text-center mb-1">{subject}</h3>
              {labels.length >= 3 ? (
                <RadarChart labels={labels} values={values} maxValue={max} />
              ) : (
                <div className="space-y-1">
                  {labels.map((l, i) => (
                    <div key={l} className="flex items-center gap-1">
                      <span className="text-[0.6rem] flex-1 truncate">{l}</span>
                      <span className="text-[0.6rem] font-bold">{values[i]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {radarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[rgba(15,23,42,0.5)]"
            style={{ backdropFilter: 'blur(6px)' }}
            onClick={() => setRadarModal(null)}
          />
          <div className="relative card animate-scale-in w-[92vw] max-w-[540px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{radarModal.subject} 약점 분포</h3>
              <button onClick={() => setRadarModal(null)} className="text-muted text-xl leading-none">&times;</button>
            </div>
            {radarModal.labels.length >= 3 ? (
              <RadarChart labels={radarModal.labels} values={radarModal.values} maxValue={radarModal.max} large />
            ) : (
              <div className="space-y-2">
                {radarModal.labels.map((l, i) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className="text-sm flex-1">{l}</span>
                    <div className="w-24 h-4 bg-background overflow-hidden" style={{ borderRadius: '4px' }}>
                      <div className="h-full bg-primary/70" style={{ width: `${(radarModal.values[i] / radarModal.max) * 100}%`, borderRadius: '4px', minWidth: '4px' }} />
                    </div>
                    <span className="text-sm font-bold w-6 text-right">{radarModal.values[i]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-bold text-sm mb-3">취약 유형 TOP {stats.topTypes.length}</h3>
        <div className="space-y-2">
          {(() => {
            let currentRank = 1
            return stats.topTypes.map(([type, count], i) => {
            if (i > 0 && count < stats.topTypes[i - 1][1]) currentRank = i + 1
            const rank = (i === 0 || count < stats.topTypes[i - 1][1]) ? currentRank : null
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary w-5 shrink-0 text-center">
                  {rank ?? ''}
                </span>
                <span className="text-sm flex-1 min-w-0 truncate">{type}</span>
                <div className="w-20 h-4 bg-background overflow-hidden shrink-0" style={{ borderRadius: '4px' }}>
                  <div
                    className="h-full bg-primary/60"
                    style={{ width: `${(count / maxTypeCount) * 100}%`, borderRadius: '4px', minWidth: '12px' }}
                  />
                </div>
                <span className="text-xs font-bold text-text-secondary w-4 text-right shrink-0">{count}</span>
              </div>
            )
          })
          })()}
        </div>
      </div>

      {selectedExamId === 'all' && repeatedWeaknesses.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-sm mb-3">반복 약점</h3>
          <p className="text-xs text-text-secondary mb-2">여러 회차에서 반복적으로 틀린 유형</p>
          <div className="space-y-1.5">
            {repeatedWeaknesses.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span>{type}</span>
                <span className="badge badge-danger text-xs">{count}회 반복</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

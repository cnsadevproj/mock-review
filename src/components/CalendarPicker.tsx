'use client'

import { useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function fmt(y: number, m: number, d: number) {
  return `${y}.${m + 1}.${d}`
}

export default function CalendarPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  const totalDays = daysInMonth(viewYear, viewMonth)
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()

  const handleDayClick = (day: number) => {
    const dateStr = fmt(viewYear, viewMonth, day)
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr)
      setEndDate(null)
    } else {
      const s = new Date(viewYear, viewMonth, day)
      const parts = startDate.split('.').map(Number)
      const sDate = new Date(parts[0], parts[1] - 1, parts[2])
      if (s < sDate) {
        setEndDate(startDate)
        setStartDate(dateStr)
      } else {
        setEndDate(dateStr)
      }
    }
  }

  const handleConfirm = () => {
    if (startDate && endDate) {
      onChange(`${startDate} ~ ${endDate}`)
    } else if (startDate) {
      onChange(`${startDate} ~`)
    }
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  const isSelected = (day: number) => {
    const d = fmt(viewYear, viewMonth, day)
    return d === startDate || d === endDate
  }

  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false
    const d = new Date(viewYear, viewMonth, day).getTime()
    const sp = startDate.split('.').map(Number)
    const ep = endDate.split('.').map(Number)
    const s = new Date(sp[0], sp[1] - 1, sp[2]).getTime()
    const e = new Date(ep[0], ep[1] - 1, ep[2]).getTime()
    return d > s && d < e
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-sm text-left px-2.5 py-1.5 bg-white border border-border
                   outline-none transition-colors placeholder:text-muted"
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        {value || <span className="text-muted">날짜 선택</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[rgba(15,23,42,0.5)]"
               style={{ backdropFilter: 'blur(6px)' }}
               onClick={() => setOpen(false)} />
          <div className="relative card animate-scale-in w-[320px]">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="text-text-secondary px-2 py-1 hover:bg-background"
                      style={{ borderRadius: 'var(--radius-sm)' }}>&lsaquo;</button>
              <span className="font-bold text-sm">{viewYear}년 {viewMonth + 1}월</span>
              <button onClick={nextMonth} className="text-text-secondary px-2 py-1 hover:bg-background"
                      style={{ borderRadius: 'var(--radius-sm)' }}>&rsaquo;</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-[0.65rem] font-bold text-muted py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const sel = isSelected(day)
                const range = isInRange(day)
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`text-sm py-1.5 transition-colors
                      ${sel
                        ? 'bg-primary text-white font-bold'
                        : range
                          ? 'bg-primary-light text-primary-dark'
                          : 'hover:bg-background'
                      }`}
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-xs text-text-secondary">
                {startDate && endDate ? `${startDate} ~ ${endDate}` : startDate ? `${startDate} ~ 종료일 선택` : '시작일을 선택하세요'}
              </span>
              <button onClick={handleConfirm} className="btn btn-primary text-sm py-1.5 px-4"
                      disabled={!startDate}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

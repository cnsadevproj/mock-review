'use client'

import { WrongAnswer } from '@/types'

interface Props {
  totalQuestions: number
  wrongAnswers: Map<number, WrongAnswer>
  activeQuestion: number | null
  onToggle: (questionNo: number) => void
}

export default function QuestionGrid({ totalQuestions, wrongAnswers, activeQuestion, onToggle }: Props) {
  return (
    <div
      className="grid gap-2.5"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))' }}
    >
      {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((no) => {
        const isWrong = wrongAnswers.has(no)
        const isActive = activeQuestion === no
        const hasType = isWrong && (wrongAnswers.get(no)?.subjectIds.length ?? 0) > 0

        let cls = 'bg-card text-foreground border border-border shadow-[var(--shadow-sm)]'
        if (isWrong && hasType) {
          cls = 'bg-danger text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)]'
        } else if (isWrong) {
          cls = 'bg-danger-light text-danger-dark border-2 border-danger'
        }

        if (isActive) {
          cls += ' ring-2 ring-primary ring-offset-2'
        }

        return (
          <button
            key={no}
            onClick={() => onToggle(no)}
            className={`aspect-square font-bold text-[0.95rem]
              flex items-center justify-center
              transition-all duration-150 active:scale-90
              ${cls}`}
            style={{ borderRadius: 'var(--radius)' }}
          >
            {no}
          </button>
        )
      })}
    </div>
  )
}

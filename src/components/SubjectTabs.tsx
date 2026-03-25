'use client'

interface Props {
  subjects: string[]
  active: string
  wrongCounts: Record<string, number>
  onSelect: (subject: string) => void
}

export default function SubjectTabs({ subjects, active, wrongCounts, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none">
      {subjects.map((s) => {
        const isActive = active === s
        const count = wrongCounts[s] || 0
        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={`shrink-0 px-4 py-2 text-sm font-semibold
              transition-all duration-200 active:scale-95
              ${isActive
                ? 'bg-primary text-white'
                : 'bg-background text-text-secondary'
              }`}
            style={{ borderRadius: '22px' }}
          >
            {s}
            {count > 0 && (
              <span className={`ml-1.5 text-xs font-bold ${isActive ? 'text-white/70' : 'text-danger'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

'use client'

export default function Spinner({ text }: { text?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full h-full gap-3">
      <div
        style={{
          width: '36px',
          height: '36px',
          borderWidth: '3px',
          borderStyle: 'solid',
          borderColor: 'var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spinner-rotate 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }}
      />
      {text && <span className="text-sm text-text-secondary">{text}</span>}
    </div>
  )
}

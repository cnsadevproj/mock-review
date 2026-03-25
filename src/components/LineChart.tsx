'use client'

interface Series {
  label: string
  color: string
  data: number[]
}

interface Props {
  xLabels: string[]
  series: Series[]
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export { COLORS as CHART_COLORS }

export default function LineChart({ xLabels, series }: Props) {
  if (xLabels.length === 0 || series.length === 0) return null

  const allVals = series.flatMap((s) => s.data)
  const maxVal = Math.max(...allVals, 1)

  const w = 320
  const h = 140
  const px = 28
  const py = 16
  const chartW = w - px * 2
  const chartH = h - py * 2

  const getX = (i: number) => xLabels.length === 1 ? w / 2 : px + (i / (xLabels.length - 1)) * chartW
  const getY = (v: number) => py + chartH - (v / maxVal) * chartH

  const gridLines = [0, 0.5, 1].map((r) => py + chartH - r * chartH)

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full">
        {gridLines.map((y, i) => (
          <line key={i} x1={px} y1={y} x2={w - px} y2={y} stroke="var(--border)" strokeWidth={0.5} />
        ))}

        {xLabels.map((label, i) => (
          <text key={i} x={getX(i)} y={py + chartH + 14} textAnchor="middle" className="text-[7px]" fill="var(--muted)">
            {label}
          </text>
        ))}

        {series.map((s) => {
          const points = s.data.map((v, i) => ({ x: getX(i), y: getY(v) }))
          const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
          return (
            <g key={s.label}>
              <path d={linePath} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={3} fill="white" stroke={s.color} strokeWidth={1.5} />
                  <text x={p.x} y={p.y - 7} textAnchor="middle" className="text-[7px] font-bold" fill={s.color}>
                    {s.data[i]}
                  </text>
                </g>
              ))}
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap gap-3 justify-center mt-1">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-[0.65rem] text-text-secondary">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

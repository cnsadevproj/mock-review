'use client'

interface Props {
  labels: string[]
  values: number[]
  maxValue: number
  large?: boolean
}

function splitLabel(label: string, maxLen: number): string[] {
  if (label.length <= maxLen) return [label]
  const words = label.split(/(?<=\s)|(?<=와\s?)|(?<=과\s?)|(?<=의\s?)|(?<=에\s?)/)
  if (words.length <= 1) {
    const mid = Math.ceil(label.length / 2)
    return [label.slice(0, mid), label.slice(mid)]
  }
  const lines: string[] = ['']
  for (const w of words) {
    if ((lines[lines.length - 1] + w).length > maxLen && lines[lines.length - 1].length > 0) {
      lines.push(w)
    } else {
      lines[lines.length - 1] += w
    }
  }
  return lines.slice(0, 2)
}

export default function RadarChart({ labels, values, maxValue, large }: Props) {
  const size = large ? 340 : 240
  const cx = size / 2
  const cy = size / 2
  const radius = large ? 110 : 90
  const labelOffset = large ? 30 : 18
  const fontSize = large ? 11 : 9
  const n = labels.length
  if (n < 3) return null

  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  const getPoint = (i: number, r: number) => {
    const angle = startAngle + i * angleStep
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const levels = [0.25, 0.5, 0.75, 1]

  const dataPoints = values.map((v, i) => {
    const ratio = Math.min(v / maxValue, 1)
    return getPoint(i, radius * ratio)
  })

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'

  const maxLabelLen = large ? 12 : 8

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={large ? 'w-full max-w-[380px] mx-auto' : 'w-full max-w-[260px] mx-auto'}>
      {levels.map((l) => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, radius * l))
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
        return <path key={l} d={path} fill="none" stroke="var(--border)" strokeWidth={1} />
      })}

      {Array.from({ length: n }, (_, i) => {
        const p = getPoint(i, radius)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={0.5} />
      })}

      <path d={dataPath} fill="rgba(59,130,246,0.15)" stroke="var(--primary)" strokeWidth={2} />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={large ? 4 : 3} fill="var(--primary)" />
      ))}

      {labels.map((label, i) => {
        const p = getPoint(i, radius + labelOffset)
        const lines = splitLabel(label, maxLabelLen)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: `${fontSize}px`, fontWeight: 600, fill: 'var(--foreground)' }}
          >
            {lines.map((line, li) => (
              <tspan key={li} x={p.x} dy={li === 0 ? `-${(lines.length - 1) * fontSize * 0.5}px` : `${fontSize + 2}px`}>
                {line}
              </tspan>
            ))}
          </text>
        )
      })}
    </svg>
  )
}

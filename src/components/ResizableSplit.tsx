'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

interface Props {
  left: React.ReactNode
  right: React.ReactNode
  defaultRatio?: number
  minRatio?: number
  maxRatio?: number
}

function getInitialRatio(key: string, defaultRatio: number) {
  if (typeof window === 'undefined') return defaultRatio
  const saved = localStorage.getItem(key)
  return saved ? parseFloat(saved) : defaultRatio
}

export default function ResizableSplit({
  left,
  right,
  defaultRatio = 0.5,
  minRatio = 0.2,
  maxRatio = 0.8,
}: Props) {
  const [isVertical, setIsVertical] = useState(false)

  useEffect(() => {
    const check = () => setIsVertical(window.innerWidth < window.innerHeight)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const storageKey = isVertical ? 'splitRatioV' : 'splitRatioH'
  const containerRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const ratioRef = useRef(getInitialRatio(storageKey, defaultRatio))

  useEffect(() => {
    ratioRef.current = getInitialRatio(storageKey, defaultRatio)
    applyRatio(ratioRef.current)
  }, [isVertical, storageKey, defaultRatio])

  const applyRatio = (r: number) => {
    if (!firstRef.current || !secondRef.current) return
    const prop = isVertical ? 'height' : 'width'
    firstRef.current.style[prop] = `calc(${r * 100}% - 4px)`
    secondRef.current.style[prop] = `calc(${(1 - r) * 100}% - 4px)`
  }

  const handleMove = useCallback((pos: number) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const total = isVertical ? rect.height : rect.width
    const offset = isVertical ? pos - rect.top : pos - rect.left
    const minPx = isVertical ? 120 : 200
    const maxPx = isVertical ? 120 : 180
    const lo = Math.max(minRatio, minPx / total)
    const hi = Math.min(maxRatio, 1 - maxPx / total)
    const r = Math.min(hi, Math.max(lo, offset / total))
    ratioRef.current = r
    applyRatio(r)
  }, [minRatio, maxRatio, isVertical])

  const handleEnd = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    if (firstRef.current) firstRef.current.style.pointerEvents = ''
    if (secondRef.current) secondRef.current.style.pointerEvents = ''
    localStorage.setItem(storageKey, String(ratioRef.current))
  }, [storageKey])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(isVertical ? e.clientY : e.clientX)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handleMove(isVertical ? e.touches[0].clientY : e.touches[0].clientX)
    }
    const onEnd = () => handleEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [handleMove, handleEnd, isVertical])

  const handleStart = () => {
    dragging.current = true
    document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
    if (firstRef.current) firstRef.current.style.pointerEvents = 'none'
    if (secondRef.current) secondRef.current.style.pointerEvents = 'none'
  }

  const init = getInitialRatio(storageKey, defaultRatio)

  if (isVertical) {
    return (
      <div ref={containerRef} className="flex flex-col h-full w-full">
        <div ref={firstRef} className="w-full overflow-hidden" style={{ height: `calc(${init * 100}% - 4px)`, minHeight: '120px' }}>
          {left}
        </div>
        <div
          className="h-2 shrink-0 cursor-row-resize flex justify-center items-center
                     bg-border hover:bg-primary/30 active:bg-primary/40 transition-colors"
          onMouseDown={handleStart}
          onTouchStart={(e) => { if (e.touches.length === 1) handleStart() }}
        >
          <div className="h-0.5 w-8 bg-muted rounded-full" />
        </div>
        <div ref={secondRef} className="w-full overflow-auto" style={{ height: `calc(${(1 - init) * 100}% - 4px)`, minHeight: '120px' }}>
          {right}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div ref={firstRef} className="h-full overflow-hidden" style={{ width: `calc(${init * 100}% - 4px)`, minWidth: '200px' }}>
        {left}
      </div>
      <div
        className="w-2 shrink-0 cursor-col-resize flex items-center justify-center
                   bg-border hover:bg-primary/30 active:bg-primary/40 transition-colors"
        onMouseDown={handleStart}
        onTouchStart={(e) => { if (e.touches.length === 1) handleStart() }}
      >
        <div className="w-0.5 h-8 bg-muted rounded-full" />
      </div>
      <div ref={secondRef} className="h-full overflow-auto" style={{ width: `calc(${(1 - init) * 100}% - 4px)`, minWidth: '180px' }}>
        {right}
      </div>
    </div>
  )
}

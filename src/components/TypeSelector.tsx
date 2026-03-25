'use client'

import { useState } from 'react'
import { getSubjectTree, getGroupTree, getSubjectById } from '@/lib/subjects'
import { SubjectItem } from '@/types'

interface Props {
  subjectGroup?: string | null
  subjectName: string
  questionNo: number
  selectedIds: number[]
  onSelect: (ids: number[]) => void
  onClose: () => void
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`text-muted transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
      style={{ width: '16px', height: '16px' }}
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0
      ${checked ? 'bg-primary border-primary' : 'border-border'}`}>
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  )
}

function MinorItem({ item, isSelected, onToggle }: { item: SubjectItem; isSelected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left py-3 px-3 text-sm
        active:scale-[0.98] transition-all duration-150
        ${isSelected ? 'bg-primary-light text-primary-dark font-semibold' : 'text-foreground active:bg-gray-100'}`}
      style={{ borderRadius: 'var(--radius-sm)' }}
    >
      <span className="flex items-center gap-2">
        <Checkbox checked={isSelected} />
        {item.minor}
      </span>
    </button>
  )
}

export default function TypeSelector({ subjectGroup, subjectName, questionNo, selectedIds, onSelect, onClose }: Props) {
  const MATH_COMMON = ['수학I', '수학II', '수학']
  const useGroupMode = subjectGroup === '국어' || subjectGroup === '수학'
  const groupTree = useGroupMode
    ? getGroupTree(subjectGroup, subjectGroup === '수학' ? MATH_COMMON : undefined)
    : null
  const simpleTree = !useGroupMode ? getSubjectTree(subjectName) : null

  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [expandedMajor, setExpandedMajor] = useState<string | null>(null)
  const [expandedMiddle, setExpandedMiddle] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set(selectedIds))

  const toggleItem = (item: SubjectItem) => {
    const next = new Set(selected)
    next.has(item.id) ? next.delete(item.id) : next.add(item.id)
    setSelected(next)
  }

  const handleDone = () => {
    onSelect([...selected])
    onClose()
  }

  const renderMiddles = (middles: Record<string, SubjectItem[]>) => (
    Object.entries(middles).map(([middle, items]) => (
      <div key={middle} className="ml-3 mb-0.5">
        <button
          onClick={() => setExpandedMiddle(expandedMiddle === middle ? null : middle)}
          className="w-full text-left py-2.5 px-3 text-sm text-text-secondary font-medium
                    flex items-center justify-between active:bg-primary-light/30 transition-colors"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {middle}
          <Chevron open={expandedMiddle === middle} />
        </button>
        {expandedMiddle === middle && (
          <div className="ml-3 space-y-0.5 pb-1 animate-fade-in">
            {items.map((item) => (
              <MinorItem
                key={item.id}
                item={item}
                isSelected={selected.has(item.id)}
                onToggle={() => toggleItem(item)}
              />
            ))}
          </div>
        )}
      </div>
    ))
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div
        className="absolute inset-0 bg-[rgba(15,23,42,0.5)]"
        style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      <div className="relative mt-auto bg-card flex flex-col animate-slide-up"
           style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', maxHeight: '75vh', minHeight: '40vh' }}>
        <div className="px-5 py-3.5 border-b border-border shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{questionNo}번</span>
              <span className="text-text-secondary text-sm">유형 선택</span>
              {selected.size > 0 && (
                <span className="badge badge-primary text-xs">{selected.size}개</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-danger font-medium px-3 py-1.5 hover:bg-danger-light transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  전체 취소
                </button>
              )}
              <button onClick={handleDone} className="btn btn-primary text-sm py-2 px-5">
                완료
              </button>
            </div>
          </div>
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-1">
              {[...selected].map((id) => {
                const item = getSubjectById(id)
                if (!item) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 text-[0.7rem] bg-primary-light text-primary-dark px-2 py-0.5 font-medium"
                    style={{ borderRadius: '12px' }}
                  >
                    {item.minor}
                    <button
                      onClick={() => {
                        const next = new Set(selected)
                        next.delete(id)
                        setSelected(next)
                      }}
                      className="text-primary/50 hover:text-primary"
                    >
                      &times;
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <div className="overflow-y-auto overscroll-contain px-4 py-2 pb-6">
          {useGroupMode && groupTree ? (
            Object.entries(groupTree).map(([subName, majors]) => (
              <div key={subName} className="mb-1">
                <button
                  onClick={() => setExpandedSub(expandedSub === subName ? null : subName)}
                  className="w-full text-left py-3 px-3 font-bold text-sm text-primary
                            flex items-center justify-between
                            active:bg-primary-light/50 transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  {subName}
                  <Chevron open={expandedSub === subName} />
                </button>

                {expandedSub === subName && (
                  <div className="animate-fade-in ml-2">
                    {Object.entries(majors).map(([major, middles]) => (
                      <div key={major} className="mb-0.5">
                        <button
                          onClick={() => setExpandedMajor(expandedMajor === major ? null : major)}
                          className="w-full text-left py-2.5 px-3 font-semibold text-sm
                                    flex items-center justify-between
                                    active:bg-primary-light/30 transition-colors"
                          style={{ borderRadius: 'var(--radius-sm)' }}
                        >
                          {major}
                          <Chevron open={expandedMajor === major} />
                        </button>
                        {expandedMajor === major && (
                          <div className="animate-fade-in">
                            {renderMiddles(middles)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : simpleTree ? (
            Object.entries(simpleTree).map(([major, middles]) => (
              <div key={major} className="mb-1">
                <button
                  onClick={() => setExpandedMajor(expandedMajor === major ? null : major)}
                  className="w-full text-left py-3 px-3 font-semibold text-sm
                            flex items-center justify-between
                            active:bg-primary-light/50 transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  {major}
                  <Chevron open={expandedMajor === major} />
                </button>
                {expandedMajor === major && (
                  <div className="animate-fade-in">
                    {renderMiddles(middles)}
                  </div>
                )}
              </div>
            ))
          ) : null}
        </div>
      </div>
    </div>
  )
}

'use client'

import { PaperInfo } from '@/data/papers'

interface Props {
  papers: PaperInfo[]
}

export default function PdfViewer({ papers }: Props) {
  if (papers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        시험지가 등록되지 않았습니다
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {papers.map((paper, i) => (
        <iframe
          key={i}
          src={paper.url}
          className="w-full border-0 flex-1"
          allow="autoplay"
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      ))}
    </div>
  )
}

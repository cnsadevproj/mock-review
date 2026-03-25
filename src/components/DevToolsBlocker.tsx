'use client'

import { useEffect } from 'react'

export default function DevToolsBlocker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return

    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === 'F12') { e.preventDefault(); return }
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) { e.preventDefault(); return }
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) { e.preventDefault(); return }
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); return }
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) { e.preventDefault(); return }
    }

    const blockContext = (e: MouseEvent) => { e.preventDefault() }

    let devtoolsOpen = false
    const threshold = 160

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold
      const heightThreshold = window.outerHeight - window.innerHeight > threshold
      if (widthThreshold || heightThreshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f1f5f9"><p style="font-size:1.2rem;color:#64748b">개발자 도구를 닫아주세요</p></div>'
        }
      } else {
        if (devtoolsOpen) {
          devtoolsOpen = false
          window.location.reload()
        }
      }
    }

    const interval = setInterval(checkDevTools, 1000)

    document.addEventListener('keydown', blockKeys)
    document.addEventListener('contextmenu', blockContext)

    return () => {
      clearInterval(interval)
      document.removeEventListener('keydown', blockKeys)
      document.removeEventListener('contextmenu', blockContext)
    }
  }, [])

  return null
}

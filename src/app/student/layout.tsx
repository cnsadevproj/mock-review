'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { isGasConnected } from '@/lib/gas'
import { getRole } from '@/lib/role'
import Spinner from '@/components/Spinner'
import { preloadUserData } from '@/lib/sync'
import DevToolsBlocker from '@/components/DevToolsBlocker'
import { getPastExams } from '@/lib/exams'

const tabs = [
  { href: '/student', label: '대시보드', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/student/exam', label: '오답 입력', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { href: '/student/plan', label: '계획 관리', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
]

function TabIcon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (session?.user?.email && getRole(session.user.email) === 'teacher') {
      router.push('/teacher')
    }
  }, [status, session, router])

  const registered = useRef(false)
  useEffect(() => {
    if (session?.user?.email && isGasConnected() && !registered.current) {
      registered.current = true
      const examIds = getPastExams().map((e) => e.examId)
      preloadUserData(session.user.email, session.user.name || '', examIds).catch(() => {})
    }
  }, [session])

  if (status === 'loading' || !session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <DevToolsBlocker />
      <header className="glass-header sticky top-0 z-50 flex items-center justify-between px-5 py-3 shrink-0">
        <h1 className="font-extrabold text-[1.1rem] text-foreground">수능 약점리스트</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">{session.user?.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {children}
        {pathname !== '/student/exam' && (
          <div className="text-center text-[0.6rem] text-muted py-3 mt-4">
            &copy; 충남삼성고등학교 신도경 &middot; pantarei01@cnsa.hs.kr
          </div>
        )}
      </main>

      <nav className="flex bg-card border-t border-border shrink-0 safe-area-bottom">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2.5 text-[0.65rem] gap-0.5
                         transition-colors duration-200
                         ${active ? 'text-primary font-bold' : 'text-muted'}`}
            >
              <TabIcon d={tab.icon} active={active} />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

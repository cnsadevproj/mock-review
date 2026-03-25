'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getRole } from '@/lib/role'
import Spinner from '@/components/Spinner'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (session?.user?.email && getRole(session.user.email) !== 'teacher') {
      router.push('/student')
    }
  }, [status, session, router])

  if (status === 'loading' || !session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="glass-header sticky top-0 z-50 flex items-center justify-between px-5 py-3 shrink-0">
        <h1 className="font-extrabold text-[1.1rem] text-foreground">수능 약점리스트 <span className="text-primary text-xs font-medium ml-1">교사</span></h1>
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
      <main className="flex-1 overflow-auto">{children}</main>
      <div className="text-center text-[0.6rem] text-muted py-1 bg-background">
        &copy; 충남삼성고등학교 신도경 &middot; pantarei01@cnsa.hs.kr
      </div>
    </div>
  )
}

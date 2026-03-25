'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getRole } from '@/lib/role'
import Spinner from '@/components/Spinner'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user?.email) {
      const role = getRole(session.user.email)
      router.push(role === 'teacher' ? '/teacher' : '/student')
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6"
         style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #93c5fd 100%)' }}>
      <div className="w-full max-w-sm text-center space-y-6 animate-fade-in">
        <div className="card py-10 px-8 space-y-6">
          <h1 className="text-2xl font-extrabold text-primary">수능 약점리스트</h1>

          <button
            onClick={() => signIn('google')}
            className="btn w-full py-3.5 px-6 bg-card border-2 border-border
                       text-foreground font-semibold text-[0.95rem]
                       flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google로 로그인
          </button>

          {process.env.NODE_ENV === 'development' && (
            <div className="space-y-2">
              <button
                onClick={() =>
                  signIn('credentials', {
                    email: '99999@cnsa.hs.kr',
                    name: '민수정',
                    callbackUrl: '/student',
                  })
                }
                className="btn btn-ghost w-full text-sm text-muted"
              >
                Dev: 학생 로그인
              </button>
              <button
                onClick={() =>
                  signIn('credentials', {
                    email: 'pantarei01@cnsa.hs.kr',
                    name: '신도경',
                    callbackUrl: '/teacher',
                  })
                }
                className="btn btn-ghost w-full text-sm text-muted"
              >
                Dev: 교사 로그인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

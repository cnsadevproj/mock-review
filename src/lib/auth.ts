import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google' && profile?.email) return true
      return false
    },
    async session({ session, token }) {
      if (session.user && token.givenName) {
        session.user.name = token.givenName as string
      }
      return session
    },
    async jwt({ token, profile }) {
      if (profile) {
        const p = profile as { given_name?: string; family_name?: string; name?: string }
        if (p.family_name === '교사' && p.given_name) {
          token.givenName = p.given_name
        } else if (p.given_name) {
          token.givenName = p.given_name
        } else {
          token.givenName = p.name || ''
        }
      }
      return token
    },
  },
  pages: {
    signIn: '/',
  },
}

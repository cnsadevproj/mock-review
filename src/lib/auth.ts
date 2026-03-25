import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

const isDev = process.env.NODE_ENV === 'development'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(isDev
      ? [
          CredentialsProvider({
            name: 'Dev Login',
            credentials: {
              email: { label: 'Email', type: 'text' },
              name: { label: 'Name', type: 'text' },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null
              return {
                id: credentials.email,
                email: credentials.email,
                name: credentials.name || 'Dev User',
              }
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile, credentials }) {
      if (isDev && credentials) return true
      if (account?.provider === 'google' && profile?.email) return true
      return false
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/',
  },
}

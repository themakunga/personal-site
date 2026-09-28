import { betterAuth } from 'better-auth'
import { db } from './db.ts'

export const auth = betterAuth({
  database: db,
  baseURL: process.env.PUBLIC_URL ?? 'http://localhost:3000',
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3100').split(','),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
})

export type Session = typeof auth.$Infer.Session

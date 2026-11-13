import { betterAuth } from 'better-auth'
import { db } from './db.ts'

const socialProviders = Object.fromEntries(
  Object.entries({
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  }).filter(([, provider]) => provider.clientId.trim() && provider.clientSecret.trim()),
)

export const enabledProviders = Object.keys(socialProviders)

export const auth = betterAuth({
  database: db,
  baseURL: process.env.PUBLIC_URL ?? 'http://localhost:3000',
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3100').split(','),
  socialProviders,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
})

export type Session = typeof auth.$Infer.Session

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './auth.ts'
import commentsRouter from './routes/comments.ts'
import captchaRouter from './routes/captcha.ts'
import adminApp from './admin/index.ts'

// Main public app
const app = new Hono()

app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3100').split(','),
    credentials: true,
  }),
)

// Auth routes (Better Auth handles all /api/auth/*)
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

// Public API
app.route('/api/captcha', captchaRouter)
app.route('/api/comments', commentsRouter)

// Admin app — separate listener on loopback only
const adminHono = new Hono()
adminHono.route('/', adminApp)

const port = Number(process.env.PORT ?? 3000)
const adminPort = Number(process.env.ADMIN_PORT ?? 3001)

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`API listening on :${port}`)
})

serve({ fetch: adminHono.fetch, port: adminPort, hostname: '127.0.0.1' }, () => {
  console.log(`Admin listening on 127.0.0.1:${adminPort}`)
})

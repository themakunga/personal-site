import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth, enabledProviders } from './auth.ts'
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
app.get('/api/auth/providers', (c) => c.json({ providers: enabledProviders }))
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

// Public API
app.route('/api/captcha', captchaRouter)
app.route('/api/comments', commentsRouter)

// Admin app — authenticated, exposed only through the private LAN proxy in production.
const adminHono = new Hono()
adminHono.route('/', adminApp)

const port = Number(process.env.PORT ?? 3000)
const adminPort = Number(process.env.ADMIN_PORT ?? 3001)

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`API listening on :${port}`)
})

const adminHost = process.env.ADMIN_HOST ?? '127.0.0.1'
serve({ fetch: adminHono.fetch, port: adminPort, hostname: adminHost }, () => {
  console.log(`Admin listening on ${adminHost}:${adminPort}`)
})

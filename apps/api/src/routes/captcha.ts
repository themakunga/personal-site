import { Hono } from 'hono'
import { createChallenge } from 'altcha-lib'

const app = new Hono()
const hmacKey = process.env.ALTCHA_HMAC_KEY ?? 'dev-key-change-me'

// GET /api/captcha/challenge
app.get('/challenge', async (c) => {
  const challenge = await createChallenge({
    hmacKey,
    maxNumber: 500_000,
    expires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
  })
  return c.json(challenge)
})

export default app

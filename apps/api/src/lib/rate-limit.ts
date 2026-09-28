// ponytail: in-memory per-IP rate limit; restart resets counters
// upgrade to Redis/Litestream if multi-instance or persistence needed
const hits = new Map<string, { count: number; reset: number }>()

export function rateLimit(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  let entry = hits.get(ip)
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + windowMs }
  }
  entry.count++
  hits.set(ip, entry)
  return entry.count <= limit
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

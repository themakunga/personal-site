import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatPostDate } from '../apps/web/app/utils/post-date.ts'

test('published post dates keep their calendar day across server and visitor time zones', () => {
  const originalZone = process.env.TZ
  try {
    for (const timeZone of ['UTC', 'America/Santiago', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = timeZone
      for (const date of ['2026-11-08', new Date('2026-11-08T00:30:00Z')]) {
        assert.equal(
          formatPostDate(date, 'es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
          '8 de noviembre de 2026',
          timeZone,
        )
        assert.equal(
          formatPostDate(date, 'es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          '08-11-2026',
          timeZone,
        )
        assert.equal(
          formatPostDate(date, 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          'November 8, 2026',
          timeZone,
        )
      }
    }
  } finally {
    if (originalZone === undefined) delete process.env.TZ
    else process.env.TZ = originalZone
  }
})

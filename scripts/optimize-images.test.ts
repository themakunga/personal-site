import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, resolve } from 'node:path'
import { test } from 'node:test'
import { optimizeImages, rewriteAssetUrls } from './optimize-images.js'
import { prepareMarkdown } from './prepare-markdown.js'

test('shrinks PNGs to WebP, reuses cache and invalidates changed content', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'webp-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const source = resolve(root, 'source.png')
  const output = resolve(root, 'assets')
  const cache = resolve(root, 'cache')
  execFileSync('magick', ['-size', '2400x1200', 'gradient:blue-red', source])
  cpSync(source, resolve(output, 'photo.png'), { recursive: true })
  const urls = optimizeImages(output, cache)
  const url = urls.get('/assets/photo.png')!
  const image = resolve(output, url.replace('/assets/', ''))
  assert.equal(
    execFileSync('magick', ['identify', '-format', '%m %wx%h', image], { encoding: 'utf8' }),
    'WEBP 1600x800',
  )
  assert.ok(statSync(image).size < statSync(source).size)
  assert.equal(existsSync(resolve(output, 'photo.png')), false)
  const cached = resolve(cache, basename(image))
  const timestamp = statSync(cached).mtimeMs
  cpSync(source, resolve(output, 'photo.png'))
  assert.equal(optimizeImages(output, cache).get('/assets/photo.png'), url)
  assert.equal(statSync(cached).mtimeMs, timestamp)

  execFileSync('magick', [
    '-size',
    '32x16',
    'xc:none',
    '-fill',
    'red',
    '-draw',
    'rectangle 0,0 8,8',
    resolve(output, 'photo.png'),
  ])
  const changed = optimizeImages(output, cache).get('/assets/photo.png')!
  assert.notEqual(changed, url)
  const smaller = resolve(output, changed.replace('/assets/', ''))
  assert.equal(
    execFileSync('magick', ['identify', '-format', '%wx%h %[opaque]', smaller], {
      encoding: 'utf8',
    }),
    '32x16 False',
  )
  assert.equal(readdirSync(cache).length, 2)
})

test('preserves existing WebP and GIF files and rejects broken PNGs without poisoning cache', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'webp-error-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const name of ['animation.gif', 'existing.webp'])
    writeFileSync(resolve(root, name), 'unchanged')
  assert.equal(optimizeImages(root, resolve(root, 'cache')).size, 0)
  assert.equal(readFileSync(resolve(root, 'animation.gif'), 'utf8'), 'unchanged')
  writeFileSync(resolve(root, 'broken.png'), 'broken')
  assert.throws(() => optimizeImages(root, resolve(root, 'cache')))
  assert.deepEqual(readdirSync(resolve(root, 'cache')), [])
})

test('rewrites hero, Markdown and Obsidian images while keeping code and URL suffixes', () => {
  const urls = new Map([['/assets/photo.png', '/assets/_optimized/hash.webp']])
  const source =
    '---\nimage: /assets/photo.png\n---\n![[photo.png]]\n![Photo](/assets/photo.png?v=2)\n`/assets/photo.png`\n~~~\n/assets/photo.png\n~~~'
  const result = prepareMarkdown(source, ['photo.png'], urls)
  assert.match(result, /image: \/assets\/_optimized\/hash.webp/)
  assert.match(result, /!\[photo.png\]\(<\/assets\/_optimized\/hash.webp>\)/)
  assert.match(result, /!\[Photo\]\(\/assets\/_optimized\/hash.webp\?v=2\)/)
  assert.ok(result.includes('`/assets/photo.png`'))
  assert.ok(result.includes('~~~\n/assets/photo.png\n~~~'))
  assert.equal(rewriteAssetUrls('/assets/photo.png.webp', urls), '/assets/photo.png.webp')
})

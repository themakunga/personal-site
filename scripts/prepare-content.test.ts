import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'

test('prepares content before rendering and stops on a broken image', (t) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'prepare-content-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const root = resolve(import.meta.dirname, '..')
  const source = resolve(directory, 'source')
  cpSync(resolve(root, 'scripts'), resolve(directory, 'scripts'), { recursive: true })
  symlinkSync(resolve(root, 'node_modules'), resolve(directory, 'node_modules'), 'dir')
  for (const path of [
    'apps/web/app',
    'source/posts',
    'source/assets',
    'source/portfolio/example',
  ]) {
    mkdirSync(resolve(directory, path), { recursive: true })
  }
  writeFileSync(resolve(directory, 'package.json'), '{"type":"module"}')
  writeFileSync(
    resolve(source, 'site.yaml'),
    JSON.stringify({
      site: { name: 'Example', title: 'Example site', url: 'https://example.com' },
      profile: { displayName: 'Example', email: 'example@example.com' },
    }),
  )
  const note = '---\ntitle: Example\ncreated_at: 2026-11-08\n---\n![[photo.png|640]]\n'
  writeFileSync(resolve(source, 'posts/example.md'), note)
  writeFileSync(resolve(source, 'portfolio/example/README.md'), note)
  writeFileSync(resolve(source, 'assets/photo.png'), 'image fixture')

  const run = () =>
    spawnSync(process.execPath, ['--import', 'tsx', 'scripts/prepare-content.ts'], {
      cwd: directory,
      env: { ...process.env, CONTENT_DIR: source },
      encoding: 'utf8',
    })
  const result = run()
  assert.equal(result.status, 0, result.stderr)
  assert.match(
    readFileSync(resolve(directory, 'apps/web/app/app.config.ts'), 'utf8'),
    /Example site/,
  )
  assert.equal(
    JSON.parse(readFileSync(resolve(directory, 'generated/site-config.json'), 'utf8')).site.name,
    'Example',
  )
  for (const path of ['post/example.md', 'portfolio/example/index.md']) {
    const content = readFileSync(resolve(directory, 'apps/web/content', path), 'utf8')
    assert.match(content, /date: 2026-11-08T00:00:00.000Z/)
    assert.match(content, /updated_at: 2026-11-08T00:00:00.000Z/)
    assert.match(content, /!\[photo.png\]\(<\/assets\/photo.png>\)\{width="640"\}/)
  }
  assert.equal(
    readFileSync(resolve(directory, 'apps/web/public/assets/photo.png'), 'utf8'),
    'image fixture',
  )
  assert.equal(readFileSync(resolve(source, 'posts/example.md'), 'utf8'), note)

  writeFileSync(resolve(source, 'posts/example.md'), note.replace('photo.png', 'missing.png'))
  const failure = run()
  assert.notEqual(failure.status, 0)
  assert.match(failure.stderr, /Image embed must match exactly one file/)
})

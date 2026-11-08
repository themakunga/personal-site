import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from 'yaml'
import { prepareMarkdown } from './prepare-markdown.js'

const assets = ['Pasted image.png', 'photos/photo.jpg', 'photos/odd (1).png']

test('converts Obsidian image paths, spaces, captions and sizes', () => {
  assert.equal(
    prepareMarkdown('![[Pasted image.png]]', assets),
    '![Pasted image.png](</assets/Pasted%20image.png>)',
  )
  assert.equal(
    prepareMarkdown('![[assets/photos/photo.jpg|A photo]]', assets),
    '![A photo](</assets/photos/photo.jpg>)',
  )
  assert.equal(
    prepareMarkdown('![[photo.jpg|300x200]]', assets),
    '![photo.jpg](</assets/photos/photo.jpg>){width="300" height="200"}',
  )
  assert.equal(
    prepareMarkdown('![[photo.jpg|300]]', assets),
    '![photo.jpg](</assets/photos/photo.jpg>){width="300"}',
  )
  assert.equal(
    prepareMarkdown('![[odd (1).png]]', assets),
    '![odd (1).png](</assets/photos/odd%20(1).png>)',
  )
})

test('leaves Markdown, note embeds, code, escapes and frontmatter intact', () => {
  const source = [
    '---',
    'title: "![[missing.png]]"',
    'date: 2026-10-01',
    'updated_at: 2026-10-01T00:00:00.000Z',
    '---',
    '![Photo](/assets/photo.jpg)',
    '![[Another note]]',
    '![[file.pdf]]',
    '`![[missing.png]]`',
    '\\![[missing.png]]',
    '    ![[missing.png]]',
    '````md',
    '![[missing.png]]',
    '```',
    '![[missing.png]]',
    '````',
    '~~~md',
    '![[missing.png]]',
    '~~~',
  ].join('\n')
  assert.equal(prepareMarkdown(source, assets), source)
})

test('rejects missing, ambiguous and escaping image paths', () => {
  for (const image of ['missing.png', '../Pasted image.png', 'duplicate.png']) {
    assert.throws(
      () => prepareMarkdown(`![[${image}]]`, [...assets, 'a/duplicate.png', 'b/duplicate.png']),
      /exactly one file/,
    )
  }
  assert.throws(
    () => prepareMarkdown('![[photo.jpg]]', ['photo.jpg', 'photos/photo.jpg']),
    /exactly one file/,
  )
  assert.equal(
    prepareMarkdown('![[assets/photo.jpg]]', ['photo.jpg', 'photos/photo.jpg']),
    '![photo.jpg](</assets/photo.jpg>)',
  )
})

test('uses created_at as the publication date while preserving an explicit date', () => {
  const source = '---\ntitle: Example\ncreated_at: 2026-11-08T01:25:53-0300\n---\nBody'
  const result = prepareMarkdown(source, assets)
  assert.equal(parse(result.split('---')[1]!).date, '2026-11-08T04:25:53.000Z')
  assert.ok(result.endsWith('\nBody'))
  const explicit = source.replace('title: Example', 'title: Example\ndate: 2026-10-01')
  assert.equal(parse(prepareMarkdown(explicit, assets).split('---')[1]!).date, '2026-10-01')
  assert.throws(
    () => prepareMarkdown(source.replace('2026-11-08T01:25:53-0300', 'invalid'), assets),
    /Invalid created_at/,
  )
})

test('normalizes updated_at for sorting and falls back to the publication date', () => {
  const source = '---\ndate: 2020-01-01\nupdated_at: 2026-11-08T01:30:00-0300\n---\nBody'
  assert.equal(
    parse(prepareMarkdown(source, assets).split('---')[1]!).updated_at,
    '2026-11-08T04:30:00.000Z',
  )
  for (const field of ['date', 'created_at']) {
    const note = `---\n${field}: 2026-10-23\n---\nBody`
    assert.equal(
      parse(prepareMarkdown(note, assets).split('---')[1]!).updated_at,
      '2026-10-23T00:00:00.000Z',
    )
  }
  assert.throws(
    () => prepareMarkdown(source.replace('2026-11-08T01:30:00-0300', 'invalid'), assets),
    /Invalid updated_at/,
  )
})

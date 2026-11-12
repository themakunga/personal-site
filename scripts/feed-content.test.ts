import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderFeedContent } from '../apps/web/server/utils/feed-content.ts'

test('renders complete formatted content with absolute article links and images', async () => {
  const html = await renderFeedContent(
    {
      type: 'minimark',
      value: [
        ['h2', { id: 'section' }, 'A heading & more'],
        ['p', {}, 'First paragraph. ', ['strong', {}, 'Bold text.']],
        ['ul', {}, ['li', {}, 'List entry']],
        ['a', { href: './next?one=1&two=2' }, 'Next'],
        ['a', { href: '#section' }, 'Section'],
        ['img', { src: '/assets/photo.webp', alt: 'A "photo"', width: '640' }],
        ['pre', { code: '<script>code & data</script> ]]>\nlast line' }],
        ['p', {}, 'Final paragraph, beyond the description.'],
      ],
    },
    'https://example.com/blog/article',
  )
  assert.match(html, /<h2 id="section">A heading &amp; more<\/h2>/)
  assert.match(html, /<strong>Bold text\.<\/strong>/)
  assert.match(html, /<ul><li>List entry<\/li><\/ul>/)
  assert.match(html, /href="https:\/\/example.com\/blog\/next\?one=1&amp;two=2"/)
  assert.match(html, /href="https:\/\/example.com\/blog\/article#section"/)
  assert.match(html, /src="https:\/\/example.com\/assets\/photo.webp"/)
  assert.match(html, /alt="A &quot;photo&quot;"/)
  assert.match(html, /<pre><code>&lt;script&gt;code &amp; data&lt;\/script&gt;/)
  assert.match(html, /Final paragraph, beyond the description\./)
})

test('keeps unsafe elements, attributes and URLs out of feed HTML', async () => {
  const html = await renderFeedContent(
    {
      type: 'minimark',
      value: [
        ['script', {}, 'alert(1)'],
        ['iframe', { src: 'https://example.com' }, 'Frame'],
        ['a', { href: 'javascript:alert(1)', onclick: 'alert(1)' }, 'Unsafe link'],
        ['img', { src: 'data:text/html,unsafe', onerror: 'alert(1)', alt: 'Safe text' }],
        ['a', { href: 'http://[' }, 'Invalid URL'],
        ['a', { href: 'mailto:author@example.com' }, 'Email'],
        ['note', {}, 'Custom component text'],
        ['p', {}, 'End of article.'],
      ],
    },
    'https://example.com/blog/article',
  )
  assert.doesNotMatch(html, /<script|<iframe|alert\(1\)|onclick|onerror|javascript:|data:text/)
  assert.match(html, /Unsafe link/)
  assert.match(html, /Invalid URL/)
  assert.match(html, /href="mailto:author@example.com"/)
  assert.match(html, /Custom component text/)
  assert.match(html, /End of article\./)
})

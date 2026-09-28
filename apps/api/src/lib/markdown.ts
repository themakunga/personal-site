// Reject unsafe Markdown: no URLs, links, images, HTML, iframes, scripts
const URL_RE = /https?:\/\//i
const HTML_RE = /<[a-z][^>]*>/i
const LINK_RE = /\[[^\]]*\]\([^)]+\)/
const IMG_RE = /!\[[^\]]*\]\([^)]+\)/
const IFRAME_RE = /<iframe/i
const SCRIPT_RE = /<script/i

const MAX_LENGTH = 2000

export function validateMarkdown(text: string): string | null {
  if (text.length > MAX_LENGTH) return `Comment too long (max ${MAX_LENGTH} chars)`
  if (IFRAME_RE.test(text)) return 'iframes are not allowed'
  if (SCRIPT_RE.test(text)) return 'Scripts are not allowed'
  if (HTML_RE.test(text)) return 'HTML is not allowed'
  if (IMG_RE.test(text)) return 'Images are not allowed'
  if (LINK_RE.test(text)) return 'Links are not allowed'
  if (URL_RE.test(text)) return 'URLs are not allowed'
  return null
}

// ponytail: regex-based validation, upgrade to remark AST if bypass cases emerge

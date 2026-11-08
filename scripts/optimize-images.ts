import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs'
import { relative, resolve } from 'node:path'

export function optimizeImages(directory: string, cache: string): Map<string, string> {
  const urls = new Map<string, string>()
  if (!existsSync(directory)) return urls
  const files = readdirSync(directory, { recursive: true, withFileTypes: true }).filter(
    (file) => file.isFile() && /\.(png|jpe?g)$/i.test(file.name),
  )
  if (!files.length) return urls
  const version = execFileSync('magick', ['-version'], { encoding: 'utf8' })
  const options = [
    '-auto-orient',
    '-colorspace',
    'sRGB',
    '-coalesce',
    '-resize',
    '1600x1600>',
    '-strip',
    '-quality',
    '80',
  ]
  mkdirSync(cache, { recursive: true })
  mkdirSync(resolve(directory, '_optimized'), { recursive: true })
  let converted = 0
  for (const file of files) {
    const input = resolve(file.parentPath, file.name)
    const hash = createHash('sha256')
      .update('webp')
      .update(version)
      .update(JSON.stringify(options))
      .update(readFileSync(input))
      .digest('hex')
    const cached = resolve(cache, `${hash}.webp`)
    if (!existsSync(cached)) {
      const temporary = `${cached}.${process.pid}.tmp`
      try {
        execFileSync('magick', [input, ...options, `webp:${temporary}`], { stdio: 'pipe' })
        renameSync(temporary, cached)
        converted++
      } finally {
        rmSync(temporary, { force: true })
      }
    }
    const output = `_optimized/${hash}.webp`
    cpSync(cached, resolve(directory, output))
    const original = relative(directory, input).replaceAll('\\', '/')
    const optimized = `/assets/${output}`
    urls.set(`/assets/${original.split('/').map(encodeURIComponent).join('/')}`, optimized)
    urls.set(`/assets/${original}`, optimized)
    rmSync(input)
  }
  console.log(`✓ images: ${converted} converted, ${files.length - converted} cached`)
  return urls
}

export function assetUrlPattern(urls: Map<string, string>): string {
  return [...urls.keys()]
    .sort((a, b) => b.length - a.length)
    .map((url) => url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
}

export function rewriteAssetUrls(text: string, urls: Map<string, string>): string {
  if (!urls.size) return text
  const pattern = new RegExp(`(?:${assetUrlPattern(urls)})(?=$|[\\s<>"')\\]?#])`, 'g')
  return text.replace(pattern, (url) => urls.get(url)!)
}

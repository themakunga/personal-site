import { basename } from 'node:path'
import { parseDocument } from 'yaml'

export function prepareMarkdown(markdown: string, assets: string[]): string {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  let header = frontmatter?.[0] ?? ''
  if (frontmatter) {
    const document = parseDocument(frontmatter[1]!)
    if (document.errors.length) throw document.errors[0]
    if (!document.has('date') && document.has('created_at')) {
      const createdAt = document.get('created_at')
      if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) {
        throw new Error('Invalid created_at: expected a publication date')
      }
      document.set('date', new Date(createdAt).toISOString())
      header = `---\n${document.toString()}---\n`
    }
  }

  const convertImage = (embed: string, target: string, option = '') => {
    if (!/\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(target)) return embed
    const path = target.replace(/^\/?assets\//, '')
    const explicitPath = /^\/?assets\//.test(target) || path.includes('/')
    const matches = assets.filter((asset) =>
      explicitPath ? asset === path : basename(asset) === path,
    )
    if (matches.length !== 1) {
      throw new Error(`Image embed must match exactly one file in assets/: ${target}`)
    }
    const url = `/assets/${matches[0]!.split('/').map(encodeURIComponent).join('/')}`
    const dimensions = option.match(/^(\d+)(?:x(\d+))?$/)
    const alt = (dimensions ? basename(target) : option || basename(target)).replace(
      /[\\[\]]/g,
      '\\$&',
    )
    const size = dimensions
      ? `{width="${dimensions[1]}"${dimensions[2] ? ` height="${dimensions[2]}"` : ''}}`
      : ''
    return `![${alt}](<${url}>)${size}`
  }

  // shortcut: handles standard fences and single-line code spans; use an AST parser for nested Markdown.
  let fence = ''
  const body = markdown.slice(frontmatter?.[0].length ?? 0)
  const converted = body.split('\n').map((line) => {
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = ''
      return line
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (opening) {
      fence = opening[1]!
      return line
    }
    if (/^( {4}|\t)/.test(line)) return line
    return line.replace(
      /(`+).*?\1|(?<!\\)!\[\[([^|\]\n]+)(?:\|([^\]\n]*))?\]\]/g,
      (match, code: string | undefined, target: string, option: string | undefined) =>
        code ? match : convertImage(match, target, option),
    )
  })
  return header + converted.join('\n')
}

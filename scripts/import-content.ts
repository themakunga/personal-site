import {
  cpSync,
  rmSync,
  readdirSync,
  renameSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareMarkdown } from './prepare-markdown.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const contentDir = process.env.CONTENT_DIR ?? resolve(root, '../personal-content')
const webDir = resolve(root, 'apps/web')

const cp = (src: string, dst: string) => {
  if (!existsSync(src)) return
  rmSync(dst, { recursive: true, force: true })
  cpSync(src, dst, { recursive: true, filter: (s) => !s.includes('/.git') })
}

// 1. Posts: personal-content/posts/ → apps/web/content/post/
cp(resolve(contentDir, 'posts'), resolve(webDir, 'content/post'))
console.log('✓ posts imported')

// 2. Portfolio: personal-content/portfolio/ → apps/web/content/portfolio/
const portfolioDst = resolve(webDir, 'content/portfolio')
cp(resolve(contentDir, 'portfolio'), portfolioDst)
// Rename README.md → index.md in each project folder
if (existsSync(portfolioDst)) {
  for (const entry of readdirSync(portfolioDst, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const readme = resolve(portfolioDst, entry.name, 'README.md')
    const index = resolve(portfolioDst, entry.name, 'index.md')
    if (existsSync(readme)) renameSync(readme, index)
  }
}
console.log('✓ portfolio imported')

// 3. Assets: personal-content/assets/ → apps/web/public/assets/
cp(resolve(contentDir, 'assets'), resolve(webDir, 'public/assets'))
console.log('✓ assets imported')

// Normalize only the generated copies; keep the Obsidian vault unchanged.
const assetsDir = resolve(contentDir, 'assets')
const assets = existsSync(assetsDir)
  ? readdirSync(assetsDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) =>
        relative(assetsDir, resolve(entry.parentPath, entry.name)).replaceAll('\\', '/'),
      )
  : []
for (const directory of [resolve(webDir, 'content/post'), portfolioDst]) {
  if (!existsSync(directory)) continue
  for (const entry of readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const path = resolve(entry.parentPath, entry.name)
    try {
      writeFileSync(path, prepareMarkdown(readFileSync(path, 'utf8'), assets))
    } catch (error) {
      throw new Error(`Failed to import ${path}`, { cause: error })
    }
  }
}
console.log('✓ Obsidian images and dates normalized')

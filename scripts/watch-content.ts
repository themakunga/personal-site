import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const contentDir = resolve(process.env.CONTENT_DIR ?? '../personal-content')
const sources = ['site.yaml', 'posts', 'portfolio', 'assets']

const snapshot = () =>
  sources
    .flatMap((source) => {
      const path = join(contentDir, source)
      if (!existsSync(path)) return []
      return source === 'site.yaml'
        ? [path]
        : readdirSync(path, { recursive: true, withFileTypes: true })
            .filter((entry) => entry.isFile())
            .map((entry) => join(entry.parentPath, entry.name))
    })
    .sort()
    .map((path) => {
      const file = statSync(path)
      return `${path}:${file.mtimeMs}:${file.size}`
    })
    .join('\n')

let previous = snapshot()
setInterval(() => {
  try {
    const current = snapshot()
    if (current === previous) return
    execFileSync('pnpm', ['config:generate'], { stdio: 'inherit' })
    execFileSync('pnpm', ['content:import'], { stdio: 'inherit' })
    previous = current
  } catch (error) {
    console.error('Content sync failed; retrying on the next check:', error)
  }
}, 1000)

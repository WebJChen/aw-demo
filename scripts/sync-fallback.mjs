/**
 * gh-pages fallback：仅同步 nav + demo 州（tasmania），避免全国全量进静态包
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fallbackDir = path.join(root, 'src', 'data', 'fallback')
const splitDir = path.join(root, 'src', 'data', 'split')
const DEMO_STATE = 'tasmania'

function copyFile(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    console.warn(`[sync-fallback] skip (missing): ${path.relative(root, sourcePath)}`)
    return
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.copyFileSync(sourcePath, targetPath)
  console.log(`[sync-fallback] ${path.relative(root, sourcePath)} -> ${path.relative(root, targetPath)}`)
}

function copyDirJsonFiles(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return
  for (const name of fs.readdirSync(sourceDir)) {
    if (!name.endsWith('.json')) continue
    copyFile(path.join(sourceDir, name), path.join(targetDir, name))
  }
}

const COPY_PAIRS = [
  [path.join(splitDir, 'nav.json'), path.join(fallbackDir, 'nav.json')],
  [path.join(splitDir, 'wine-subnav.json'), path.join(fallbackDir, 'wine-subnav.json')],
  [path.join(splitDir, 'shard-manifest.json'), path.join(fallbackDir, 'shard-manifest.json')],
  [path.join(splitDir, 'item', `${DEMO_STATE}.json`), path.join(fallbackDir, 'item', `${DEMO_STATE}.json`)],
  [path.join(splitDir, 'wine', `${DEMO_STATE}.json`), path.join(fallbackDir, 'wine', `${DEMO_STATE}.json`)],
  [path.join(splitDir, 'catalog', 'search-manifest.json'), path.join(fallbackDir, 'catalog', 'search-manifest.json')],
]

for (const [sourcePath, targetPath] of COPY_PAIRS) {
  copyFile(sourcePath, targetPath)
}

// 二级分片：demo 州的 subNav 块 + 搜索分片
copyDirJsonFiles(
  path.join(splitDir, 'item', DEMO_STATE),
  path.join(fallbackDir, 'item', DEMO_STATE)
)
copyDirJsonFiles(
  path.join(splitDir, 'wine', DEMO_STATE),
  path.join(fallbackDir, 'wine', DEMO_STATE)
)

const demoSearchDir = path.join(splitDir, 'catalog', 'search', DEMO_STATE)
if (fs.existsSync(demoSearchDir)) {
  copyDirJsonFiles(demoSearchDir, path.join(fallbackDir, 'catalog', 'search', DEMO_STATE))
} else {
  for (const suffix of ['item', 'wine']) {
    copyFile(
      path.join(splitDir, 'catalog', 'search', `${DEMO_STATE}-${suffix}.json`),
      path.join(fallbackDir, 'catalog', 'search', `${DEMO_STATE}-${suffix}.json`)
    )
  }
}

console.log(`[sync-fallback] demo state=${DEMO_STATE}`)

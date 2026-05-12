import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const projectRoot = process.cwd()
const assetsRoot = path.join(projectRoot, 'src', 'assets')
const optimizedRoot = path.join(assetsRoot, '.optimized')

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const THUMB_MAX_WIDTH = 720
const THUMB_QUALITY = 64

async function walkDirectory(dirPath, collector = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '.optimized') continue
      await walkDirectory(absolutePath, collector)
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (!IMAGE_EXTS.has(ext)) continue
    collector.push(absolutePath)
  }
  return collector
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

function toThumbOutputPath(sourcePath) {
  const relative = path.relative(assetsRoot, sourcePath)
  const parsed = path.parse(relative)
  const outputDir = path.join(optimizedRoot, parsed.dir)
  const outputName = `${parsed.name}.thumb.webp`
  return path.join(outputDir, outputName)
}

async function shouldSkipGeneration(sourcePath, outputPath) {
  try {
    const [srcStat, outStat] = await Promise.all([fs.stat(sourcePath), fs.stat(outputPath)])
    return outStat.mtimeMs >= srcStat.mtimeMs
  } catch {
    return false
  }
}

async function generateThumb(sourcePath) {
  const outputPath = toThumbOutputPath(sourcePath)
  const skip = await shouldSkipGeneration(sourcePath, outputPath)
  if (skip) return { status: 'skipped', sourcePath, outputPath }

  await ensureDir(path.dirname(outputPath))
  await sharp(sourcePath)
    .resize({ width: THUMB_MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toFile(outputPath)

  return { status: 'generated', sourcePath, outputPath }
}

async function main() {
  await ensureDir(optimizedRoot)
  const files = await walkDirectory(assetsRoot)
  let generated = 0
  let skipped = 0

  for (const filePath of files) {
    try {
      const result = await generateThumb(filePath)
      if (result.status === 'generated') generated += 1
      if (result.status === 'skipped') skipped += 1
    } catch (error) {
      console.warn(`[thumb] failed: ${path.relative(projectRoot, filePath)} -> ${error.message}`)
    }
  }

  console.log(`[thumb] done. generated=${generated}, skipped=${skipped}, total=${files.length}`)
}

main().catch((error) => {
  console.error('[thumb] fatal error:', error)
  process.exitCode = 1
})

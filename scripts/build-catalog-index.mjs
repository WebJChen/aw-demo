/**
 * 从 split 产物生成搜索轻量索引（大州按 subNav 二级分片）
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const splitDir = path.join(projectRoot, 'src', 'data', 'split')
const catalogDir = path.join(splitDir, 'catalog')
const searchDir = path.join(catalogDir, 'search')
const itemDir = path.join(splitDir, 'item')
const wineDir = path.join(splitDir, 'wine')

function extractDesc(item) {
  if (typeof item?.wineData?.desc === 'string') return item.wineData.desc.trim()
  if (typeof item?.info?.desc === 'string') return item.info.desc.trim()
  if (typeof item?.desc === 'string') return item.desc.trim()
  return ''
}

function extractTags(item) {
  const tags = []
  for (const list of [item?.info?.tags, item?.wineData?.tags]) {
    if (!Array.isArray(list)) continue
    for (const tag of list) {
      if (typeof tag === 'string' && tag.trim()) tags.push(tag.trim())
    }
  }
  return tags
}

function flattenInfoText(info) {
  if (!info || typeof info !== 'object') return ''
  const parts = []
  if (typeof info.name === 'string') parts.push(info.name)
  if (typeof info.desc === 'string') parts.push(info.desc)
  if (Array.isArray(info.features)) {
    for (const f of info.features) {
      if (f?.title) parts.push(f.title)
      if (f?.desc) parts.push(f.desc)
    }
  }
  if (Array.isArray(info.tags)) parts.push(...info.tags.filter((t) => typeof t === 'string'))
  return parts.join(' ')
}

function flattenWineDataText(wineData) {
  if (!wineData || typeof wineData !== 'object') return ''
  const parts = []
  if (typeof wineData.desc === 'string') parts.push(wineData.desc)
  if (typeof wineData.wineryName === 'string') parts.push(wineData.wineryName)
  if (typeof wineData.originRegion === 'string') parts.push(wineData.originRegion)
  if (typeof wineData.vintage === 'string') parts.push(wineData.vintage)
  return parts.join(' ')
}

function buildRowsFromSubNav(region, subNav, sourceType) {
  const rows = []
  const navName = region?.navName || ''
  const regionPath = region?.path || ''
  const subNavName = subNav?.subNavName || ''
  const subNavPath = subNav?.subNavPath || ''
  const itemData = Array.isArray(subNav?.itemData) ? subNav.itemData : []

  itemData.forEach((item, itemIndex) => {
    const title = item?.title || ''
    const enTitle = item?.enTitle || ''
    const desc = extractDesc(item)
    const tags = extractTags(item)
    const infoText = [flattenInfoText(item?.info), flattenWineDataText(item?.wineData)].join(' ').trim()
    const fullText = [navName, subNavName, title, enTitle, desc, tags.join(' '), infoText].join(' ')

    rows.push({
      id: `${sourceType}__${regionPath}__${subNavPath}__${itemIndex}`,
      navName,
      regionPath,
      subNavName,
      subNavPath,
      title,
      enTitle,
      desc,
      tags,
      infoText,
      fullText,
      itemIndex,
      sourceType,
    })
  })

  return rows
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function readRegionShell(baseDir, regionPath) {
  return readJson(path.join(baseDir, `${regionPath}.json`))
}

async function readSubNavChunk(baseDir, regionPath, subNavPath) {
  return readJson(path.join(baseDir, regionPath, `${subNavPath}.json`))
}

async function loadRegionForIndex(baseDir, regionPath, sourceType, shardManifest) {
  const shell = await readRegionShell(baseDir, regionPath)
  if (!shell) return null

  const shardedPaths = shardManifest?.[sourceType]?.[regionPath]
  if (!Array.isArray(shardedPaths) || !shardedPaths.length) {
    return shell
  }

  const subNavList = []
  for (const subNavPath of shardedPaths) {
    const chunk = await readSubNavChunk(baseDir, regionPath, subNavPath)
    if (chunk) {
      subNavList.push({
        subNavPath: chunk.subNavPath || subNavPath,
        subNavName: chunk.subNavName || '',
        isShow: chunk.isShow,
        itemData: Array.isArray(chunk.itemData) ? chunk.itemData : [],
      })
    }
  }

  return { ...shell, subNavList }
}

async function writeShard(relativeFile, rows) {
  const targetPath = path.join(catalogDir, relativeFile)
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, `${JSON.stringify(rows)}\n`, 'utf8')
  return { file: relativeFile, count: rows.length }
}

async function buildCatalogTypeIndex(catalogType, baseDir, shardManifest) {
  let names = []
  try {
    names = await fs.readdir(baseDir)
  } catch {
    return []
  }

  const shards = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const regionPath = name.replace(/\.json$/, '')
    const region = await loadRegionForIndex(baseDir, regionPath, catalogType, shardManifest)
    if (!region) continue

    const shardedPaths = shardManifest?.[catalogType]?.[regionPath]
    const subNavList = Array.isArray(region.subNavList) ? region.subNavList : []

    if (Array.isArray(shardedPaths) && shardedPaths.length > 1) {
      for (const subNav of subNavList) {
        const subNavPath = subNav?.subNavPath
        if (!subNavPath) continue
        const rows = buildRowsFromSubNav(region, subNav, catalogType === 'wine' ? 'wine' : 'item')
        const relativeFile = `search/${regionPath}/${subNavPath}-${catalogType}.json`
        const meta = await writeShard(relativeFile, rows)
        shards.push({
          regionPath,
          subNavPath,
          sourceType: catalogType === 'wine' ? 'wine' : 'item',
          ...meta,
        })
      }
    } else {
      const rows = subNavList.flatMap((subNav) => buildRowsFromSubNav(region, subNav, catalogType === 'wine' ? 'wine' : 'item'))
      const relativeFile = `search/${regionPath}-${catalogType}.json`
      const meta = await writeShard(relativeFile, rows)
      shards.push({
        regionPath,
        sourceType: catalogType === 'wine' ? 'wine' : 'item',
        ...meta,
      })
    }
  }

  return shards
}

async function main() {
  await fs.mkdir(searchDir, { recursive: true })

  const shardManifest = (await readJson(path.join(splitDir, 'shard-manifest.json'))) || { item: {}, wine: {} }

  const itemShards = await buildCatalogTypeIndex('item', itemDir, shardManifest)
  const wineShards = await buildCatalogTypeIndex('wine', wineDir, shardManifest)
  const shards = [...itemShards, ...wineShards]
  const totalRows = shards.reduce((sum, shard) => sum + (Number(shard.count) || 0), 0)

  const manifest = { version: 2, totalRows, shards }
  await fs.writeFile(
    path.join(catalogDir, 'search-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  )

  console.log(`[build-catalog-index] shards=${shards.length}, rows=${totalRows}`)
}

main().catch((error) => {
  console.error('[build-catalog-index] fatal error:', error)
  process.exitCode = 1
})

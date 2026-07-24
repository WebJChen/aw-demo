import fs from 'node:fs/promises'
import path from 'node:path'
import { CATALOG_TYPES, SHARD_MIN_CHARS } from './split-config.mjs'

const projectRoot = process.cwd()
const itemFilePath = path.join(projectRoot, 'src', 'data', 'item.json')
const wineFilePath = path.join(projectRoot, 'src', 'data', 'wine.json')
const splitDirPath = path.join(projectRoot, 'src', 'data', 'split')
const splitItemDirPath = path.join(splitDirPath, 'item')
const splitWineDirPath = path.join(splitDirPath, 'wine')

function buildNavMeta(itemSource = []) {
  return itemSource.map((region) => ({
    id: region?.id || null,
    navName: region?.navName || '',
    capital: region?.capital || '',
    available: region?.available,
    path: region?.path || '',
    subNavList: Array.isArray(region?.subNavList)
      ? region.subNavList.map((subNav) => ({
          subNavName: subNav?.subNavName || '',
          subNavPath: subNav?.subNavPath || '',
          isShow: subNav?.isShow
        }))
      : []
  }))
}

function shouldShardRegion(region) {
  try {
    return JSON.stringify(region).length >= SHARD_MIN_CHARS
  } catch {
    return false
  }
}

function buildRegionShell(region) {
  return {
    id: region?.id ?? null,
    navName: region?.navName || '',
    capital: region?.capital || '',
    available: region?.available,
    path: region?.path || '',
    sharded: true,
    subNavList: Array.isArray(region?.subNavList)
      ? region.subNavList.map((subNav) => ({
          subNavName: subNav?.subNavName || '',
          subNavPath: subNav?.subNavPath || '',
          isShow: subNav?.isShow,
        }))
      : [],
  }
}

async function writeJsonFile(targetPath, content) {
  const serialized = `${JSON.stringify(content, null, 2)}\n`
  await fs.writeFile(targetPath, serialized, 'utf8')
}

async function writeRegionSplit(baseDir, region, manifestBucket) {
  const regionPath = String(region?.path || '').trim()
  if (!regionPath) return { sharded: false }

  if (!shouldShardRegion(region)) {
    await writeJsonFile(path.join(baseDir, `${regionPath}.json`), region)
    return { sharded: false, regionPath }
  }

  const shardDir = path.join(baseDir, regionPath)
  await fs.mkdir(shardDir, { recursive: true })
  await writeJsonFile(path.join(baseDir, `${regionPath}.json`), buildRegionShell(region))

  const subNavPaths = []
  for (const subNav of region.subNavList || []) {
    const subNavPath = String(subNav?.subNavPath || '').trim()
    if (!subNavPath) continue
    subNavPaths.push(subNavPath)
    await writeJsonFile(path.join(shardDir, `${subNavPath}.json`), {
      subNavPath,
      subNavName: subNav?.subNavName || '',
      isShow: subNav?.isShow,
      itemData: Array.isArray(subNav?.itemData) ? subNav.itemData : [],
    })
  }

  manifestBucket[regionPath] = subNavPaths
  return { sharded: true, regionPath, subNavPaths }
}

async function main() {
  const [itemRaw, wineRaw] = await Promise.all([
    fs.readFile(itemFilePath, 'utf8'),
    fs.readFile(wineFilePath, 'utf8')
  ])
  const itemSource = JSON.parse(itemRaw)
  const wineSource = JSON.parse(wineRaw)
  const navMeta = buildNavMeta(itemSource)
  const itemRegions = Array.isArray(itemSource) ? itemSource : []
  const wineRegions = Array.isArray(wineSource) ? wineSource : []

  await Promise.all([
    fs.mkdir(splitDirPath, { recursive: true }),
    fs.mkdir(splitItemDirPath, { recursive: true }),
    fs.mkdir(splitWineDirPath, { recursive: true })
  ])

  const shardManifest = {
    version: 1,
    shardMinChars: SHARD_MIN_CHARS,
    item: {},
    wine: {},
  }

  let itemShardCount = 0
  let wineShardCount = 0

  for (const region of itemRegions) {
    const result = await writeRegionSplit(splitItemDirPath, region, shardManifest.item)
    if (result.sharded) itemShardCount += 1
  }
  for (const region of wineRegions) {
    const result = await writeRegionSplit(splitWineDirPath, region, shardManifest.wine)
    if (result.sharded) wineShardCount += 1
  }

  await Promise.all([
    writeJsonFile(path.join(splitDirPath, 'nav.json'), navMeta),
    writeJsonFile(path.join(splitDirPath, 'item-regions.json'), itemRegions.map((region) => region?.path).filter(Boolean)),
    writeJsonFile(path.join(splitDirPath, 'wine-regions.json'), wineRegions.map((region) => region?.path).filter(Boolean)),
    writeJsonFile(path.join(splitDirPath, 'shard-manifest.json'), shardManifest),
  ])

  const wineSubNavSource = wineRegions.find((region) => Array.isArray(region?.subNavList) && region.subNavList.length)
  const wineSubNavMeta = Array.isArray(wineSubNavSource?.subNavList)
    ? wineSubNavSource.subNavList.map((subNav) => ({
        subNavName: subNav?.subNavName || '',
        subNavPath: subNav?.subNavPath || '',
        isShow: subNav?.isShow,
      }))
    : []

  await writeJsonFile(path.join(splitDirPath, 'wine-subnav.json'), wineSubNavMeta)

  console.log(
    `[data-split] done. nav=${navMeta.length}, itemRegions=${itemRegions.length}, wineRegions=${wineRegions.length}, ` +
    `wineSubNav=${wineSubNavMeta.length}, itemSharded=${itemShardCount}, wineSharded=${wineShardCount}`
  )
}

main().catch((error) => {
  console.error('[data-split] fatal error:', error)
  process.exitCode = 1
})

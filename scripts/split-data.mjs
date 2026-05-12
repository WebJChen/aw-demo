import fs from 'node:fs/promises'
import path from 'node:path'

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

async function writeJsonFile(targetPath, content) {
  const serialized = `${JSON.stringify(content, null, 2)}\n`
  await fs.writeFile(targetPath, serialized, 'utf8')
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

  await Promise.all([
    writeJsonFile(path.join(splitDirPath, 'nav.json'), navMeta),
    writeJsonFile(path.join(splitDirPath, 'item-regions.json'), itemRegions.map((region) => region?.path).filter(Boolean)),
    writeJsonFile(path.join(splitDirPath, 'wine-regions.json'), wineRegions.map((region) => region?.path).filter(Boolean))
  ])

  await Promise.all(itemRegions.map((region) => {
    const regionPath = String(region?.path || '').trim()
    if (!regionPath) return Promise.resolve()
    return writeJsonFile(path.join(splitItemDirPath, `${regionPath}.json`), region)
  }))

  await Promise.all(wineRegions.map((region) => {
    const regionPath = String(region?.path || '').trim()
    if (!regionPath) return Promise.resolve()
    return writeJsonFile(path.join(splitWineDirPath, `${regionPath}.json`), region)
  }))

  console.log(`[data-split] done. nav=${navMeta.length}, itemRegions=${itemRegions.length}, wineRegions=${wineRegions.length}`)
}

main().catch((error) => {
  console.error('[data-split] fatal error:', error)
  process.exitCode = 1
})

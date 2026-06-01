import { getItemRegionByPath, getWineRegionByPath } from '@/utils/dataRepository'
import { buildWineryGridDisplay } from '@/utils/wineryGridExtras'
import { buildWineDisplay } from '@/utils/wineGridExtras'
import { resolveDataImage } from '@/utils/dataImageResolver'

const UNCATEGORIZED_REGION = '暂未分类分区'
const UNCATEGORIZED_TOWN = '暂未分类城镇'

function normalizeWineryAreaInfo(item) {
  const info = item?.info || item?.wineData || item?.itemData || {}
  const regionRaw = String(item?.region || info?.region || '').trim()
  const townRaw = String(item?.town || info?.town || '').trim()
  return {
    region: regionRaw || UNCATEGORIZED_REGION,
    town: townRaw || UNCATEGORIZED_TOWN
  }
}

function getWineryRegionDisplayName(item) {
  const region = normalizeWineryAreaInfo(item).region
  return region === UNCATEGORIZED_REGION ? '暂未分类' : region
}

function getWineryTownDisplayName(item) {
  const town = normalizeWineryAreaInfo(item).town
  return town === UNCATEGORIZED_TOWN ? '暂未分类城镇' : town
}

const VISIT_TIPS = [
  '建议提前预约品鉴或参观，旺季周末名额有限。',
  '部分酒窖仅接受成年人入内，请携带有效身份证件。',
  '自驾访客请注意酒庄内部限速与指定停车区域。'
]

export function getClassicWineDisplayLimit(device) {
  const { isPhone, isPortrait, isTablet, isPc } = device || {}
  if (isPhone) return isPortrait ? 3 : 4
  if (isTablet) return 4
  if (isPc) return 5
  return 4
}

export function getClassicWineGridClass(device) {
  const { isPhone, isPortrait, isTablet, isPc } = device || {}
  if (isPhone) return isPortrait ? 'winery-detail-wines--cols-1' : 'winery-detail-wines--cols-2'
  if (isTablet) return 'winery-detail-wines--cols-4'
  if (isPc) return 'winery-detail-wines--cols-5'
  return 'winery-detail-wines--cols-4'
}

export async function loadWineryDetailContext(regionPath, subNavPath, itemIndexRaw) {
  const itemIndex = Number(itemIndexRaw)
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return null

  const region = await getItemRegionByPath(regionPath)
  if (!region) return null

  const subNav = (region.subNavList || []).find((nav) => nav.subNavPath === subNavPath)
  if (!subNav) return null

  const items = Array.isArray(subNav.itemData)
    ? subNav.itemData
    : Array.isArray(subNav.info)
      ? subNav.info
      : []
  const item = items[itemIndex]
  if (!item) return null

  return {
    region,
    subNav,
    item,
    itemIndex,
    regionPath,
    subNavPath,
    regionNavName: region.navName || '',
    subNavName: subNav.subNavName || ''
  }
}

function readItemInfo(item) {
  return item?.info || item?.wineData || item?.itemData || null
}

export function resolveWineryDetailImages(item, fallbackBanner = '') {
  const info = readItemInfo(item)
  const groups = [
    info?.images,
    info?.banners,
    info?.bannerList,
    info?.imgs,
    item?.images,
    item?.banners,
    item?.bannerList,
    item?.imgs,
    item?.img ? [item.img] : []
  ]

  const images = groups
    .flatMap((group) => (Array.isArray(group) ? group : []))
    .map((image) => resolveDataImage(image, undefined, { variant: 'thumb' }) || resolveDataImage(image))
    .filter(Boolean)

  if (images.length) return Array.from(new Set(images))

  const fallback = resolveDataImage(fallbackBanner || item?.img, undefined, { variant: 'thumb' })
    || resolveDataImage(fallbackBanner || item?.img)
  return fallback ? [fallback] : []
}

export function buildWineryDetailPageModel(ctx) {
  const { item, region, subNav, itemIndex, regionPath, subNavPath, regionNavName } = ctx
  const info = readItemInfo(item) || {}
  const gridDisplay = buildWineryGridDisplay(item, {
    subNavPath,
    sourceItemIndex: itemIndex,
    idx: itemIndex
  })

  const features = Array.isArray(info.features) ? info.features : []
  const tags = Array.isArray(info.tags) ? info.tags : []
  const source = Array.isArray(info.source) ? info.source : []

  const websiteFeature = features.find((f) => /网站|官网|website/i.test(String(f?.title || '')))
  const websiteUrl = String(info.website || websiteFeature?.desc || '').trim()

  return {
    title: item?.title || info.name || '酒庄详情',
    enTitle: item?.enTitle || '',
    regionNavName,
    subNavName: subNav?.subNavName || '',
    capital: region?.capital || '',
    regionLabel: getWineryRegionDisplayName(item),
    townLabel: getWineryTownDisplayName(item),
    intro:
      info.desc ||
      info.dialogInfoDesc ||
      `${item?.title || '该酒庄'}的详细介绍正在整理中。欢迎通过下方联系方式预约到访或咨询在售酒款。`,
    features,
    tags,
    source,
    websiteUrl,
    visitLabel: gridDisplay.visitLabel,
    wineryType: gridDisplay.wineryType,
    styleTags: gridDisplay.styleTags || [],
    visitTips: VISIT_TIPS,
    hasSource: source.length > 0,
    sourceSummary: source[0]?.desc || 'TasTrips.Online资料整理'
  }
}

function normalizeWineryMatchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, ' ')
    .trim()
}

function scoreWineForWinery(wineItem, wineryItem) {
  const wineryKeys = [
    wineryItem?.title,
    wineryItem?.enTitle,
    readItemInfo(wineryItem)?.name
  ]
    .map(normalizeWineryMatchText)
    .filter(Boolean)

  if (!wineryKeys.length) return 0

  const wineKeys = [
    wineItem?.title,
    wineItem?.enTitle,
    wineItem?.wineData?.wineryName,
    wineItem?.wineData?.wineryLabel
  ]
    .map(normalizeWineryMatchText)
    .filter(Boolean)

  let score = 0
  wineryKeys.forEach((wk) => {
    wineKeys.forEach((vk) => {
      if (!wk || !vk) return
      if (wk === vk) score += 100
      else if (vk.includes(wk) || wk.includes(vk)) score += 40
      else if (wk.length >= 4 && vk.includes(wk.slice(0, 4))) score += 15
    })
  })
  return score
}

export async function loadClassicWinesForWinery(ctx, limit = 5) {
  const { regionPath, item, itemIndex } = ctx
  const wineRegion = await getWineRegionByPath(regionPath)
  if (!wineRegion) return []

  const pool = []
  for (const subNav of wineRegion.subNavList || []) {
    if (subNav?.isShow === false) continue
    for (const [idx, wineItem] of (subNav.itemData || []).entries()) {
      pool.push({
        wineItem,
        subNavPath: subNav.subNavPath,
        subNavName: subNav.subNavName,
        sourceItemIndex: idx,
        score: scoreWineForWinery(wineItem, item),
        isTest: wineItem?.cartTestEnabled === true
      })
    }
  }

  if (!pool.length) return []

  const testPool = pool.filter((row) => row.isTest)
  let sorted
  if (testPool.length) {
    sorted = testPool
  } else {
    const matched = pool.filter((row) => row.score > 0).sort((a, b) => b.score - a.score)
    sorted = matched.length >= Math.min(2, limit) ? matched : [...pool]
  }

  const offset = (Number(itemIndex) || 0) % Math.max(1, sorted.length)
  const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)]
  const takeAll = limit == null || Number(limit) <= 0
  const sliceCount = takeAll ? rotated.length : Math.min(Number(limit) || 5, rotated.length)

  return rotated.slice(0, sliceCount).map((row) => ({
    data: row.wineItem,
    regionPath,
    subNavPath: row.subNavPath,
    subNavName: row.subNavName,
    sourceItemIndex: row.sourceItemIndex,
    hitKey: buildWineHitKey(regionPath, row.subNavPath, row.sourceItemIndex),
    regionNavName: wineRegion.navName || ctx.regionNavName || '',
    display: buildWineDisplay(row.wineItem, { regionNavName: wineRegion.navName || ctx.regionNavName || '' })
  }))
}

export function buildWineHitKey(regionPath, subNavPath, sourceItemIndex) {
  return `wine__${regionPath}__${subNavPath}__${sourceItemIndex}`
}

export function buildWineryDetailRouteTarget(regionPath, subNavPath, itemIndex) {
  return {
    name: 'WineryDetail',
    params: {
      regionPath,
      subNav: subNavPath,
      itemIndex: String(itemIndex)
    }
  }
}

export function buildWineryListRouteTarget(regionPath, subNavPath) {
  return {
    name: 'WineryPreview',
    params: { regionPath, subNav: subNavPath }
  }
}

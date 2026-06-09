import { getItemRegionByPath, getWineRegionByPath } from '@/utils/dataRepository'
import { buildCatalogHitKey } from '@/utils/catalogHitKey'
import { buildWineryGridDisplay } from '@/utils/wineryGridExtras'
import { buildWineDisplay } from '@/utils/wineGridExtras'
import { resolveItemDetailImageUrls } from '@/utils/itemImageResolver'

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

const DEFAULT_VISIT_GUIDE = [
  { label: '预约建议', text: '建议提前预约品鉴或参观，旺季周末名额有限。' },
  { label: '到访年龄', text: '部分酒窖仅接受成年人入内，请携带有效身份证件。' },
  { label: '自驾提示', text: '自驾访客请注意酒庄内部限速与指定停车区域。' }
]

const TERROIR_FIELD_LABELS = [
  ['subRegion', '子产区'],
  ['elevation', '海拔'],
  ['soils', '土壤'],
  ['climate', '气候'],
  ['grapes', '主要品种'],
  ['style', '酿造风格']
]

function normalizeTextRow(row) {
  if (row == null) return null
  if (typeof row === 'string') {
    const text = row.trim()
    return text ? { label: '', text } : null
  }
  if (typeof row !== 'object') return null

  const label = String(row.label || row.title || '').trim()
  const text = String(row.text || row.desc || row.value || '').trim()
  if (!label && !text) return null
  return { label, text }
}

function normalizeTextRows(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeTextRow).filter(Boolean)
}

function formatTerroirValue(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join('、')
  return String(value || '').trim()
}

function normalizeTerroir(info) {
  const raw = info?.terroir
  if (!raw) return { summary: '', rows: [], hasContent: false }

  if (typeof raw === 'string') {
    const summary = raw.trim()
    return { summary, rows: [], hasContent: Boolean(summary) }
  }

  if (Array.isArray(raw)) {
    const rows = normalizeTextRows(raw).map((row) => ({
      label: row.label || '要点',
      value: row.text
    }))
    return { summary: '', rows, hasContent: rows.length > 0 }
  }

  if (typeof raw === 'object') {
    const summary = String(raw.summary || raw.desc || '').trim()
    const rows = []

    if (Array.isArray(raw.rows)) {
      raw.rows.forEach((row) => {
        const label = String(row?.label || row?.title || '').trim()
        const value = formatTerroirValue(row?.value ?? row?.text ?? row?.desc)
        if (label || value) rows.push({ label: label || '要点', value })
      })
    } else {
      TERROIR_FIELD_LABELS.forEach(([key, label]) => {
        const value = formatTerroirValue(raw[key])
        if (value) rows.push({ label, value })
      })
    }

    return { summary, rows, hasContent: Boolean(summary || rows.length) }
  }

  return { summary: '', rows: [], hasContent: false }
}

function normalizeStory(info) {
  const raw = info?.story
  if (!raw) {
    const legacy = String(info?.history || info?.storyText || '').trim()
    if (!legacy) return { summary: '', timeline: [], hasContent: false }
    return { summary: legacy, timeline: [], hasContent: true }
  }

  if (typeof raw === 'string') {
    const summary = raw.trim()
    return { summary, timeline: [], hasContent: Boolean(summary) }
  }

  if (typeof raw === 'object') {
    const summary = String(raw.summary || raw.desc || '').trim()
    const timeline = Array.isArray(raw.timeline)
      ? raw.timeline
          .map((item) => ({
            year: String(item?.year || item?.period || '').trim(),
            title: String(item?.title || item?.label || '').trim(),
            desc: String(item?.desc || item?.text || '').trim()
          }))
          .filter((item) => item.year || item.title || item.desc)
      : []
    return { summary, timeline, hasContent: Boolean(summary || timeline.length) }
  }

  return { summary: '', timeline: [], hasContent: false }
}

function normalizeAwards(info) {
  const raw = info?.awards
  if (!raw) return { items: [], hasContent: false }

  if (Array.isArray(raw)) {
    const items = raw
      .map((item) => {
        if (typeof item === 'string') {
          const title = item.trim()
          return title ? { title, year: '', issuer: '' } : null
        }
        if (typeof item !== 'object') return null
        const title = String(item.title || item.name || item.desc || '').trim()
        const year = String(item.year || '').trim()
        const issuer = String(item.issuer || item.org || item.source || '').trim()
        if (!title && !issuer) return null
        return { title: title || issuer, year, issuer: title ? issuer : '' }
      })
      .filter(Boolean)
    return { items, hasContent: items.length > 0 }
  }

  return { items: [], hasContent: false }
}

function normalizeVisitGuide(info) {
  const custom = normalizeTextRows(info?.visitGuide || info?.visit)
  if (custom.length) return { items: custom, hasContent: true }
  return { items: DEFAULT_VISIT_GUIDE, hasContent: true, isDefault: true }
}

function normalizeServices(info) {
  const raw = info?.services
  if (!Array.isArray(raw)) return { items: [], hasContent: false }
  const items = raw.map((item) => String(item || '').trim()).filter(Boolean)
  return { items, hasContent: items.length > 0 }
}

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
  return resolveItemDetailImageUrls(item, fallbackBanner, { variant: 'thumb' })
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
    terroir: normalizeTerroir(info),
    story: normalizeStory(info),
    awards: normalizeAwards(info),
    visitGuide: normalizeVisitGuide(info),
    services: normalizeServices(info),
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
  const matched = pool.filter((row) => row.score > 0).sort((a, b) => b.score - a.score)
  let sorted
  if (matched.length) {
    sorted = matched
  } else if (testPool.length) {
    sorted = testPool
  } else {
    sorted = [...pool]
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
    hitKey: buildWineHitKey(regionPath, row.subNavPath, row.sourceItemIndex, row.wineItem),
    regionNavName: wineRegion.navName || ctx.regionNavName || '',
    display: buildWineDisplay(row.wineItem, { regionNavName: wineRegion.navName || ctx.regionNavName || '' })
  }))
}

export function buildWineHitKey(regionPath, subNavPath, sourceItemIndex, wineItem) {
  return buildCatalogHitKey('wine', regionPath, subNavPath, wineItem, sourceItemIndex)
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

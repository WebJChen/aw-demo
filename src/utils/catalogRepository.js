import {
  fetchNavTree,
  fetchWineCatalog,
  fetchWineDetail,
  fetchWineryCatalog,
  fetchWineryDetail,
  fetchWineryWines,
  isApiEnabled,
  isLocalJsonFallbackEnabled,
} from '@/utils/auswineApi'
import {
  getNavData,
  getSearchIndex,
  getSearchManifest,
  getSearchShard,
  getWineRegionByPath,
  getWineRegionPaths,
  loadWineRegionsByPaths,
} from '@/utils/dataRepository'
import { buildWineDisplay, resolveWineCartUnitPrice } from '@/utils/wineGridExtras'
import { resolveRegionPathFromNavName } from '@/utils/navHelpers'

function hasWinerySubNav(region) {
  return (region?.subNavList || []).some((subNav) =>
    subNav?.subNavPath === 'wineries' || String(subNav?.subNavName || '').includes('酒庄')
  )
}

function mergeApiNavMeta(apiTree, localTree, catalogType) {
  const localByPath = new Map((localTree || []).map((region) => [region?.path, region]))
  return (apiTree || []).map((region) => {
    const local = localByPath.get(region?.path) || {}
    const shouldUseLocalItemSubNav = catalogType === 'item' && !hasWinerySubNav(region)
    return {
      ...region,
      navName: region?.navName || local.navName || '',
      capital: region?.capital || local.capital || '',
      subNavList: shouldUseLocalItemSubNav
        ? (Array.isArray(local.subNavList) ? local.subNavList : [])
        : (Array.isArray(region?.subNavList) ? region.subNavList : []),
    }
  })
}

function parseCardExtraJson(row) {
  if (!row?.cardExtraJson) return {}
  try {
    return typeof row.cardExtraJson === 'string'
      ? JSON.parse(row.cardExtraJson)
      : row.cardExtraJson
  } catch {
    return {}
  }
}

export function mapApiCatalogDetailToItemData(dto) {
  if (!dto || typeof dto !== 'object') return null
  const extra = parseCardExtraJson(dto)
  const detail = dto.detail && typeof dto.detail === 'object' ? dto.detail : {}
  const info = detail.info || extra.info || dto.info
  const infoObj = info && typeof info === 'object' ? info : {}
  return {
    ...extra,
    ...detail,
    id: dto.id ?? extra.id,
    title: dto.title || extra.title || '',
    enTitle: dto.enTitle ?? extra.enTitle ?? '',
    img: dto.coverUrl ?? dto.cover ?? extra.img,
    region: extra.region || detail.region || infoObj.region || '',
    town: extra.town || detail.town || infoObj.town || '',
    postcode: extra.postcode || detail.postcode || infoObj.postcode || '',
    locationLabel: extra.locationLabel || detail.locationLabel || infoObj.locationLabel || '',
    info,
    wineData: detail.wineData || extra.wineData,
    testPrice: dto.price ?? extra.testPrice,
  }
}

export function mapApiWineryRow(dto) {
  const data = mapApiCatalogDetailToItemData(dto)
  if (!data) return null
  return {
    data,
    regionPath: dto.statePath || dto.regionPath || '',
    regionNavName: dto.stateName || dto.regionNavName || '',
    subNavPath: dto.subNavPath || '',
    subNavName: dto.subNavName || '',
    sourceItemIndex: dto.sourceItemIndex ?? dto.itemIndex ?? 0,
    catalogId: dto.id,
  }
}

function mapApiWineRow(row) {
  if (!row || typeof row !== 'object') return null
  const extra = parseCardExtraJson(row)
  const data = {
    ...extra,
    id: row.id ?? extra.id,
    title: row.title || extra.title || '',
    enTitle: row.enTitle ?? extra.enTitle ?? '',
    img: row.coverUrl ?? row.cover ?? row.img ?? extra.img,
    testPrice: row.price ?? row.testPrice ?? extra.testPrice,
    originalPrice: row.originalPrice ?? extra.originalPrice,
    currencySymbol: row.currencySymbol ?? extra.currencySymbol ?? '¥',
    wineData: row.wineData && typeof row.wineData === 'object'
      ? { ...row.wineData, ...(extra.wineData || {}) }
      : (extra.wineData || {
        name: row.title,
        wineryName: row.wineryName,
        originRegion: row.giLabel || row.originRegion,
        vintage: row.vintage,
      }),
  }

  return {
    data,
    regionPath: row.statePath || row.regionPath || '',
    regionNavName: row.stateName || row.regionNavName || '',
    subNavPath: row.subNavPath || '',
    subNavName: row.subNavName || '',
    sourceItemIndex: row.sourceItemIndex ?? row.itemIndex ?? 0,
  }
}

export function mapWineRegionRows(region, subNavPath) {
  if (!region || !subNavPath) return []
  const subNav = region.subNavList?.find(
    (item) => item?.subNavPath === subNavPath && item?.isShow !== false
  )
  if (!Array.isArray(subNav?.itemData)) return []

  return subNav.itemData.map((data, sourceItemIndex) => ({
    data,
    regionPath: region.path,
    regionNavName: region.navName,
    subNavPath: subNav.subNavPath,
    subNavName: subNav.subNavName,
    sourceItemIndex,
  }))
}

const WINE_PRICE_TIER_RANGES = {
  lt200: { priceMax: 199.99 },
  '200400': { priceMin: 200, priceMax: 399.99 },
  '400800': { priceMin: 400, priceMax: 799.99 },
  gt800: { priceMin: 800 },
}

function resolvePriceTierRange(priceTier) {
  return WINE_PRICE_TIER_RANGES[priceTier] || {}
}

const WINE_PRICE_TIER_MATCHERS = {
  lt200: (p) => p < 200,
  '200400': (p) => p >= 200 && p < 400,
  '400800': (p) => p >= 400 && p < 800,
  gt800: (p) => p >= 800,
}

function wineEntryMatchesFilters(entry, { keyword, stateName, priceTier }) {
  if (stateName && String(entry.regionNavName || '').trim() !== String(stateName).trim()) {
    return false
  }
  if (priceTier) {
    const price = resolveWineCartUnitPrice(entry.data)
    const matcher = WINE_PRICE_TIER_MATCHERS[priceTier]
    if (matcher && !matcher(Number(price) || 0)) return false
  }
  if (keyword) {
    const d = buildWineDisplay(entry.data, { regionNavName: entry.regionNavName })
    const hay = [
      entry.data?.title,
      entry.data?.enTitle,
      d?.origin,
      d?.vintage,
      entry.data?.wineData?.wineryName,
      entry.regionNavName,
    ].join(' ').toLowerCase()
    const tokens = String(keyword).toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (tokens.length && !tokens.every((t) => hay.includes(t))) return false
  }
  return true
}

function sortWineEntries(entries, sortBy) {
  const out = [...entries]
  const priceOf = (e) => Number(resolveWineCartUnitPrice(e.data)) || 0
  const ratingOf = (e) => {
    const d = buildWineDisplay(e.data, { regionNavName: e.regionNavName })
    return Number(d?.rating) || 0
  }

  switch (sortBy) {
    case 'priceAsc':
      return out.sort((a, b) => priceOf(a) - priceOf(b))
    case 'priceDesc':
      return out.sort((a, b) => priceOf(b) - priceOf(a))
    case 'ratingDesc':
      return out.sort((a, b) => ratingOf(b) - ratingOf(a))
    default:
      return out
  }
}

export async function loadNavCatalog({ catalogType } = {}) {
  if (isApiEnabled()) {
    const tree = await fetchNavTree({ catalogType })
    const apiTree = Array.isArray(tree) ? tree : []
    const localTree = await getNavData()
    return mergeApiNavMeta(apiTree, localTree, catalogType)
  }
  if (isLocalJsonFallbackEnabled()) {
    try {
      const mod = await import('@/data/fallback/nav.json')
      return Array.isArray(mod?.default) ? mod.default : await getNavData()
    } catch {
      return getNavData()
    }
  }
  return getNavData()
}

export async function loadRegionNavMeta(regionPath, { catalogType } = {}) {
  const path = String(regionPath || '').trim()
  if (!path) return null
  const nav = await loadNavCatalog({ catalogType })
  return nav.find((region) => region?.path === path) || null
}

export async function loadItemRegion(regionPath, options = {}) {
  if (isApiEnabled()) {
    return loadRegionNavMeta(regionPath, { catalogType: 'item' })
  }
  const { subNavPath, hydrateAll = false } = options
  if (isLocalJsonFallbackEnabled()) {
    try {
      const mod = await import(`@/data/fallback/item/${regionPath}.json`)
      const shell = mod?.default && typeof mod.default === 'object' ? mod.default : null
      if (!shell?.sharded) return shell
      const manifestMod = await import('@/data/fallback/shard-manifest.json').catch(() => null)
      const paths = hydrateAll
        ? (manifestMod?.default?.item?.[regionPath] || [])
        : (subNavPath ? [subNavPath] : [])
      if (!paths.length) return shell
      let hydrated = shell
      for (const snPath of paths) {
        try {
          const chunkMod = await import(`@/data/fallback/item/${regionPath}/${snPath}.json`)
          const chunk = chunkMod?.default
          if (chunk) {
            hydrated = {
              ...hydrated,
              subNavList: (hydrated.subNavList || []).map((sn) => (
                sn.subNavPath === snPath
                  ? { ...sn, ...chunk, itemData: chunk.itemData || [] }
                  : sn
              )),
            }
          }
        } catch {
          // skip missing chunk
        }
      }
      return hydrated
    } catch {
      // fall through
    }
  }
  return getItemRegionByPath(regionPath, { subNavPath, hydrateAll })
}

export async function loadWineRegion(regionPath, options = {}) {
  if (isApiEnabled()) {
    return loadRegionNavMeta(regionPath, { catalogType: 'wine' })
  }
  const { subNavPath, hydrateAll = false } = options
  if (isLocalJsonFallbackEnabled()) {
    try {
      const mod = await import(`@/data/fallback/wine/${regionPath}.json`)
      const shell = mod?.default && typeof mod.default === 'object' ? mod.default : null
      if (!shell?.sharded) return shell
      const manifestMod = await import('@/data/fallback/shard-manifest.json').catch(() => null)
      const paths = hydrateAll
        ? (manifestMod?.default?.wine?.[regionPath] || [])
        : (subNavPath ? [subNavPath] : [])
      if (!paths.length) return shell
      let hydrated = shell
      for (const snPath of paths) {
        try {
          const chunkMod = await import(`@/data/fallback/wine/${regionPath}/${snPath}.json`)
          const chunk = chunkMod?.default
          if (chunk) {
            hydrated = {
              ...hydrated,
              subNavList: (hydrated.subNavList || []).map((sn) => (
                sn.subNavPath === snPath
                  ? { ...sn, ...chunk, itemData: chunk.itemData || [] }
                  : sn
              )),
            }
          }
        } catch {
          // skip missing chunk
        }
      }
      return hydrated
    } catch {
      // fall through
    }
  }
  return getWineRegionByPath(regionPath, { subNavPath, hydrateAll })
}

/**
 * 按州加载 wine 分区（替代 getAllWineRegions 全国一次性加载）
 * @param {{ statePaths?: string[], activeNavName?: string, subNavPath?: string, hydrateAll?: boolean }} options
 */
export async function loadWineRegions(options = {}) {
  if (isApiEnabled()) {
    return []
  }

  const { subNavPath, hydrateAll = false } = options
  let paths = Array.isArray(options.statePaths) ? options.statePaths.filter(Boolean) : []
  if (!paths.length && options.activeNavName) {
    const fromNav = resolveRegionPathFromNavName(options.activeNavName)
    if (fromNav) paths = [fromNav]
  }
  if (!paths.length) {
    paths = await getWineRegionPaths()
  }

  return loadWineRegionsByPaths(paths, { subNavPath, hydrateAll })
}

/** 逐州加载，每完成一州回调（全国 lazy load） */
export async function loadWineRegionsIncremental(statePaths, onRegionLoaded, options = {}) {
  const paths = Array.isArray(statePaths) ? statePaths.filter(Boolean) : []
  const { subNavPath, hydrateAll = false } = options
  const loaded = []
  for (const path of paths) {
    const region = await loadWineRegion(path, { subNavPath, hydrateAll })
    if (region) {
      loaded.push(region)
      if (typeof onRegionLoaded === 'function') {
        onRegionLoaded(region, [...loaded])
      }
    }
  }
  return loaded
}

export async function resolveAllWineRegionPaths() {
  return getWineRegionPaths()
}

/**
 * 酒款 catalog 分页（API 模式走服务端；JSON 模式在已加载分区上客户端分页）
 */
export async function fetchWineCatalogPage({
  subNavPath,
  statePath,
  stateName,
  keyword,
  priceTier,
  sortBy = 'default',
  pageNum = 1,
  pageSize = 24,
  loadedRegions = [],
} = {}) {
  if (isApiEnabled()) {
    const { priceMin, priceMax } = resolvePriceTierRange(priceTier)
    const data = await fetchWineCatalog({
      state: statePath || undefined,
      subNav: subNavPath,
      q: keyword || undefined,
      priceMin,
      priceMax,
      sort: sortBy !== 'default' ? sortBy : undefined,
      pageNum,
      pageSize,
    })
    const items = Array.isArray(data?.items) ? data.items.map(mapApiWineRow).filter(Boolean) : []
    return {
      items,
      total: Number(data?.total) || items.length,
      pageNum: Number(data?.pageNum) || pageNum,
      pageSize: Number(data?.pageSize) || pageSize,
    }
  }

  let entries = []
  for (const region of loadedRegions) {
    entries = entries.concat(mapWineRegionRows(region, subNavPath))
  }

  entries = entries.filter((entry) => wineEntryMatchesFilters(entry, {
    keyword,
    stateName: stateName || (statePath ? loadedRegions.find((r) => r.path === statePath)?.navName : ''),
    priceTier,
  }))
  entries = sortWineEntries(entries, sortBy)

  const total = entries.length
  const start = (Math.max(1, pageNum) - 1) * pageSize
  const items = entries.slice(start, start + pageSize)

  return { items, total, pageNum, pageSize }
}

/**
 * 酒庄 catalog 分页（API 模式）
 */
export async function fetchWineryCatalogPage({
  subNavPath,
  statePath,
  pageNum = 1,
  pageSize = 24,
} = {}) {
  if (!isApiEnabled()) {
    return { items: [], total: 0, pageNum, pageSize }
  }
  const data = await fetchWineryCatalog({
    state: statePath || undefined,
    subNav: subNavPath,
    pageNum,
    pageSize,
  })
  const items = Array.isArray(data?.items) ? data.items.map(mapApiWineryRow).filter(Boolean) : []
  return {
    items,
    total: Number(data?.total) || items.length,
    pageNum: Number(data?.pageNum) || pageNum,
    pageSize: Number(data?.pageSize) || pageSize,
  }
}

export async function loadWineryDetailByIndex(regionPath, subNavPath, itemIndex) {
  if (!isApiEnabled()) return null
  const idx = Number(itemIndex)
  if (!Number.isInteger(idx) || idx < 0) return null
  const page = await fetchWineryCatalog({
    state: regionPath,
    subNav: subNavPath,
    pageNum: 1,
    pageSize: 500,
  })
  const row = (Array.isArray(page?.items) ? page.items : [])
    .find((item) => Number(item?.sourceItemIndex) === idx)
  if (!row?.id) return null
  return fetchWineryDetail(row.id)
}

export async function loadWineryClassicWines(wineryId, { pageSize = 50 } = {}) {
  if (!isApiEnabled() || !wineryId) return []
  const page = await fetchWineryWines(wineryId, { pageNum: 1, pageSize })
  const items = Array.isArray(page?.items) ? page.items : []
  return items.map((row) => mapApiWineRow(row)).filter(Boolean)
}

export async function loadWineDetailById(wineId) {
  if (!wineId) return null
  if (!isApiEnabled()) return null
  const dto = await fetchWineDetail(wineId)
  if (!dto || typeof dto !== 'object') return null
  const merged = {
    ...dto,
    ...(dto.detail && typeof dto.detail === 'object' ? dto.detail : {}),
    wineData: dto.detail?.wineData || dto.wineData,
    img: dto.coverUrl ?? dto.img,
    testPrice: dto.price ?? dto.testPrice,
  }
  return mapApiWineRow(merged)?.data || null
}

export async function loadWineryDetailById(wineryId) {
  if (!wineryId) return null
  if (!isApiEnabled()) return null
  const dto = await fetchWineryDetail(wineryId)
  return mapApiCatalogDetailToItemData(dto)
}

export async function loadLocalSearchIndexRows() {
  const index = await getSearchIndex()
  if (Array.isArray(index) && index.length) return index
  return []
}

export async function loadWineSubNavCatalog() {
  if (isApiEnabled()) {
    const nav = await loadNavCatalog()
    const first = nav[0]
    const wineRegion = nav.find((region) =>
      Array.isArray(region?.subNavList) && region.subNavList.some((sn) => sn?.subNavPath?.includes('wine'))
    ) || first
    return Array.isArray(wineRegion?.subNavList) ? wineRegion.subNavList : []
  }
  try {
    const mod = await import('@/data/split/wine-subnav.json')
    if (Array.isArray(mod?.default) && mod.default.length) return mod.default
  } catch {
    // fall through
  }
  const firstPath = (await getWineRegionPaths())[0]
  if (!firstPath) return []
  const region = await loadWineRegion(firstPath)
  return Array.isArray(region?.subNavList) ? region.subNavList : []
}

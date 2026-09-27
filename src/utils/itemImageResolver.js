import { resolveDataImage } from '@/utils/dataImageResolver'
import { SORT_MODES, sortLocationItems } from '@/utils/ausWineLocationPostcodes'

const LOCATION_CARD_FALLBACKS = [
  '../assets/img/footer/bgfooter1.jpg',
  '../assets/img/footer/bgfooter2.jpg',
]

const WINERY_CARD_FALLBACKS = [
  '../assets/img/footer/footer1.jpg',
  '../assets/img/footer/footer2.jpg',
  '../assets/img/footer/footer3.jpg',
  '../assets/img/footer/footer4.jpg',
]

function resolveAssetUrl(path, options = {}) {
  const variant = options.variant || 'thumb'
  return resolveDataImage(path, '', { variant }) || resolveDataImage(path) || resolveDataImage('', '', { variant })
}

function hashSeed(seed) {
  const text = String(seed || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash
}

function wineryFallbackSeed(item) {
  return [
    item?.itemKey,
    item?.enTitle,
    item?.title,
  ].map((value) => String(value || '').trim()).filter(Boolean).join('|')
}

function isSameWineryItem(left, right) {
  if (!left || !right) return false
  if (left === right) return true
  if (left.itemKey && right.itemKey && left.itemKey === right.itemKey) return true
  return String(left.enTitle || '') === String(right.enTitle || '')
    && String(left.title || '') === String(right.title || '')
}

/** 与列表同一套邮编排序后的封面轮换下标，详情页用来对上同一张 footer 图 */
export function findWineryCoverCycleIndex(item, siblings = []) {
  if (!item || !Array.isArray(siblings) || !siblings.length) return undefined
  const sorted = sortLocationItems(siblings, SORT_MODES.POSTCODE)
  const index = sorted.findIndex((row) => isSameWineryItem(row, item))
  return index >= 0 ? index : undefined
}

function readNestedInfo(item) {
  if (!item || typeof item !== 'object') return null
  return item.info || item.wineData || item.itemData || null
}

function normalizePathList(value) {
  if (value == null || value === '') return []
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean)
  }
  const single = String(value).trim()
  return single ? [single] : []
}

function readCoverPath(item) {
  if (!item || typeof item !== 'object') return ''

  if (Object.prototype.hasOwnProperty.call(item, 'cover')) {
    const cover = String(item.cover || '').trim()
    if (cover) return cover
  }

  const info = readNestedInfo(item)
  if (info && Object.prototype.hasOwnProperty.call(info, 'cover')) {
    const cover = String(info.cover || '').trim()
    if (cover) return cover
  }

  return ''
}

function collectGalleryPathGroups(item) {
  const info = readNestedInfo(item)
  return [
    item?.img,
    item?.images,
    item?.banners,
    item?.bannerList,
    item?.imgs,
    info?.img,
    info?.images,
    info?.banners,
    info?.bannerList,
    info?.imgs
  ]
}

/** 图集原始路径（不含 cover 优先逻辑，仅合并各字段） */
export function collectGalleryPaths(item) {
  return collectGalleryPathGroups(item).flatMap(normalizePathList)
}

/** 轮播用路径：cover 在前，再合并 img / imgs 等，去重保序 */
export function collectItemImagePaths(item) {
  const seen = new Set()
  const paths = []

  const push = (path) => {
    if (!path || seen.has(path)) return
    seen.add(path)
    paths.push(path)
  }

  push(readCoverPath(item))
  collectGalleryPaths(item).forEach(push)
  return paths
}

/** 列表封面 / 缩略图用的原始路径：有 cover 用 cover，否则图集第一张 */
export function getItemCoverPath(item) {
  const cover = readCoverPath(item)
  if (cover) return cover
  const gallery = collectGalleryPaths(item)
  return gallery[0] || ''
}

function resolvePath(path, options = {}) {
  const raw = String(path || '').trim()
  if (!raw) return ''

  const variant = String(options.variant || '').trim().toLowerCase()
  if (variant && variant !== 'original') {
    return resolveDataImage(raw, '', { variant }) || resolveDataImage(raw, '')
  }
  return resolveDataImage(raw, '')
}

/** 网格卡片缩略图 URL */
export function resolveItemGridImageUrl(item, fallback, options = {}) {
  const coverPath = getItemCoverPath(item)
  const variant = options.variant || 'thumb'
  if (coverPath) {
    return resolvePath(coverPath, { variant }) || resolveDataImage('', fallback, { variant })
  }
  return resolveDataImage('', fallback, { variant })
}

/** 单张封面 URL（弹窗 banner 属性、收藏等） */
export function resolveItemCoverImageUrl(item, fallback, options = {}) {
  const coverPath = getItemCoverPath(item)
  if (!coverPath) return resolveDataImage('', fallback, options)
  return resolvePath(coverPath, options) || resolveDataImage('', fallback, options)
}

/** 地点+邮编标题卡：bgfooter1 / bgfooter2 按出现顺序轮流 */
export function resolveLocationCardImageUrl(locationIndex = 0, options = {}) {
  const path = LOCATION_CARD_FALLBACKS[Math.abs(Number(locationIndex) || 0) % LOCATION_CARD_FALLBACKS.length]
  return resolveAssetUrl(path, options)
}

/** 酒庄卡无图时 footer1~4；有封面则用封面。详情页用同一套，保证同图。 */
export function resolveWineryCardImageUrl(item, options = {}) {
  const coverPath = getItemCoverPath(item)
  if (coverPath) {
    const resolved = resolvePath(coverPath, { variant: options.variant || 'thumb' })
    if (resolved) return resolved
  }
  const fallbackIndex = options.fallbackIndex
  const index = Number.isInteger(fallbackIndex)
    ? fallbackIndex
    : hashSeed(wineryFallbackSeed(item))
  const path = WINERY_CARD_FALLBACKS[Math.abs(index) % WINERY_CARD_FALLBACKS.length]
  return resolveAssetUrl(path, options)
}

/** 详情 / 弹窗轮播 URL 列表 */
export function resolveItemDetailImageUrls(item, fallbackBanner = '', options = {}) {
  const paths = collectItemImagePaths(item)
  const fallback = String(fallbackBanner || '').trim()
  if (fallback && !paths.includes(fallback)) {
    paths.unshift(fallback)
  }

  const resolved = paths.map((path) => resolvePath(path, options)).filter(Boolean)
  if (resolved.length) return Array.from(new Set(resolved))

  const fb = resolvePath(fallback, options)
  return fb ? [fb] : []
}

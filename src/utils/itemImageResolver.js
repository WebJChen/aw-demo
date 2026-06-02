import { resolveDataImage } from '@/utils/dataImageResolver'

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

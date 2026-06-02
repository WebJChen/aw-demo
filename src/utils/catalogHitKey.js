/** 目录条目稳定定位键：item__{region}__{subNav}__{slug}（兼容旧版数字下标） */

export function slugifyCatalogTitle(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'item'

  const ascii = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (ascii) return ascii.slice(0, 96)

  return raw
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '')
    .slice(0, 96) || 'item'
}

export function buildCatalogHitKey(sourceType, regionPath, subNavPath, item, itemIndex = 0) {
  const type = String(sourceType || '').trim()
  const region = String(regionPath || '').trim()
  const subNav = String(subNavPath || '').trim()
  const slug = slugifyCatalogTitle(item?.title || item?.enTitle || '')
  const base = `${type}__${region}__${subNav}__${slug}`

  if (itemIndex > 0) return `${base}--${itemIndex}`
  return base
}

export function parseCatalogHitKey(hitKey) {
  const raw = String(hitKey || '').trim()
  const parts = raw.split('__')
  if (parts.length < 4) return null

  const sourceType = parts[0]
  const regionPath = parts[1]
  const subNavPath = parts[2]
  const tail = parts.slice(3).join('__')
  if (!tail) return null

  if (/^\d+$/.test(tail)) {
    return {
      sourceType,
      regionPath,
      subNavPath,
      slug: null,
      slugSuffix: 0,
      legacyIndex: Number(tail)
    }
  }

  const dupMatch = tail.match(/^(.+)--(\d+)$/)
  if (dupMatch) {
    return {
      sourceType,
      regionPath,
      subNavPath,
      slug: dupMatch[1],
      slugSuffix: Number(dupMatch[2]),
      legacyIndex: null
    }
  }

  return {
    sourceType,
    regionPath,
    subNavPath,
    slug: tail,
    slugSuffix: 0,
    legacyIndex: null
  }
}

/**
 * @param {Array} entries
 * @param {string} hitKey
 * @param {(entry: unknown) => string} buildKeyForEntry
 */
export function findCatalogEntryIndexByHitKey(entries, hitKey, buildKeyForEntry) {
  const list = Array.isArray(entries) ? entries : []
  const key = String(hitKey || '').trim()
  if (!key || typeof buildKeyForEntry !== 'function') return -1

  let idx = list.findIndex((entry) => buildKeyForEntry(entry) === key)
  if (idx >= 0) return idx

  const parsed = parseCatalogHitKey(key)
  if (!parsed) return -1

  if (Number.isInteger(parsed.legacyIndex) && parsed.legacyIndex >= 0) {
    return parsed.legacyIndex < list.length ? parsed.legacyIndex : -1
  }

  if (parsed.slug) {
    const expected =
      parsed.slugSuffix > 0
        ? `${parsed.sourceType}__${parsed.regionPath}__${parsed.subNavPath}__${parsed.slug}--${parsed.slugSuffix}`
        : `${parsed.sourceType}__${parsed.regionPath}__${parsed.subNavPath}__${parsed.slug}`
    idx = list.findIndex((entry) => buildKeyForEntry(entry) === expected)
    if (idx >= 0) return idx
    return list.findIndex((entry) => buildKeyForEntry(entry).endsWith(`__${parsed.slug}`))
  }

  return -1
}

/** 构建索引时处理同 slug 重复 */
export function createCatalogSlugAllocator() {
  const counts = new Map()
  return (regionPath, subNavPath, item) => {
    const region = String(regionPath || '').trim()
    const subNav = String(subNavPath || '').trim()
    const slug = slugifyCatalogTitle(item?.title || item?.enTitle || '')
    const bucket = `${region}__${subNav}__${slug}`
    const used = counts.get(bucket) || 0
    counts.set(bucket, used + 1)
    return buildCatalogHitKey('item', region, subNav, item, used)
  }
}

export function createWineSlugAllocator() {
  const counts = new Map()
  return (regionPath, subNavPath, item) => {
    const region = String(regionPath || '').trim()
    const subNav = String(subNavPath || '').trim()
    const slug = slugifyCatalogTitle(item?.title || item?.enTitle || '')
    const bucket = `${region}__${subNav}__${slug}`
    const used = counts.get(bucket) || 0
    counts.set(bucket, used + 1)
    return buildCatalogHitKey('wine', region, subNav, item, used)
  }
}

/** 与导入器一致：`${itemType}__${regionPath}__${subNavPath}__${sourceIndex}` */

export function buildWineryItemKey(regionPath, subNavPath, itemIndex) {
  const idx = Number(itemIndex)
  const safeIndex = Number.isInteger(idx) && idx >= 0 ? idx : 0
  return `winery__${String(regionPath || '').trim()}__${String(subNavPath || '').trim()}__${safeIndex}`
}

export function parseCatalogItemKey(itemKey) {
  const raw = String(itemKey || '').trim()
  const parts = raw.split('__')
  if (parts.length < 4) return null
  const itemIndex = Number(parts[parts.length - 1])
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return null
  return {
    itemType: parts[0],
    regionPath: parts[1],
    subNavPath: parts.slice(2, -1).join('__'),
    itemIndex,
    itemKey: raw,
  }
}

export function resolveWineryItemKey(entry) {
  const existing = String(entry?.itemKey || entry?.data?.itemKey || '').trim()
  if (existing) return existing
  return buildWineryItemKey(
    entry?.regionPath,
    entry?.subNavPath,
    entry?.sourceItemIndex ?? entry?.itemIndex
  )
}

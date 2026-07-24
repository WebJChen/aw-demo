import navJson from '@/data/split/nav.json'
import { isApiEnabled, isLocalJsonFallbackEnabled } from '@/utils/auswineApi'

let fallbackNavCache = null
let apiNavCache = null

export function setApiNavCache(regions) {
  apiNavCache = Array.isArray(regions) ? regions : null
}

/** 同步导航（路由/bootstrap 可用；API 模式下需先 setApiNavCache） */
export function getNavDataSync() {
  if (isApiEnabled() && apiNavCache) {
    return apiNavCache
  }
  if (isLocalJsonFallbackEnabled() && fallbackNavCache) {
    return fallbackNavCache
  }
  return Array.isArray(navJson) ? navJson : []
}

export async function preloadFallbackNav() {
  if (!isLocalJsonFallbackEnabled()) return getNavDataSync()
  if (fallbackNavCache) return fallbackNavCache
  try {
    const mod = await import('@/data/fallback/nav.json')
    fallbackNavCache = Array.isArray(mod?.default) ? mod.default : getNavDataSync()
  } catch {
    fallbackNavCache = getNavDataSync()
  }
  return fallbackNavCache
}

export function findRegionByPath(path) {
  const key = String(path || '').trim()
  if (!key) return null
  return getNavDataSync().find((region) => region?.path === key) || null
}

export function findRegionByNavName(navName) {
  const key = String(navName || '').trim()
  if (!key) return null
  return getNavDataSync().find((region) => region?.navName === key) || null
}

export function resolveRegionPathFromNavName(navName) {
  return findRegionByNavName(navName)?.path || ''
}

export function getAvailableNavRegions() {
  return getNavDataSync().filter((region) => region?.available !== false)
}

export function isLegacyWineRegionRouteName(name) {
  if (typeof name !== 'string' || !name) return false
  return getNavDataSync().some((region) => region.path === name)
}

export function buildNavMenuItems() {
  return getNavDataSync().map((item) => ({
    tag: item.navName,
    slug: item.path,
    available: item.available !== false,
    capital: item.capital,
    firstSubNavPath: item.subNavList?.find((subNav) => subNav?.isShow !== false)?.subNavPath,
  }))
}

export function buildWineFilterStateOptions() {
  return getAvailableNavRegions()
    .map((region) => ({
      value: region?.navName || '',
      label: region?.navName || '',
    }))
    .filter((opt) => opt.value)
}

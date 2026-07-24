import wineSubNavCatalog from '@/data/split/wine-subnav.json'
import { isLegacyWineRegionRouteName as isLegacyRegionRoute } from '@/utils/navHelpers'

export const WINE_GRID_ROUTE_NAME = 'WineGrid'
export const FALLBACK_WINE_SUB_NAV_PATH = 'red-wine'

/** 酒款子分类与路径以 wine-subnav.json 为基准（八州一致） */
export function getWineSubNavCatalog() {
  return Array.isArray(wineSubNavCatalog) ? wineSubNavCatalog : []
}

export function resolveWineSubNavPath(options = {}) {
  const list = getWineSubNavCatalog().filter((subNav) => subNav?.isShow !== false)
  const { subNavPath, subNavName, activeSubNavName } = options

  if (subNavPath) {
    const byPath = list.find((subNav) => subNav.subNavPath === subNavPath)
    if (byPath) return byPath.subNavPath
  }

  const name = subNavName || activeSubNavName
  if (name) {
    const byName = list.find((subNav) => subNav.subNavName === name)
    if (byName) return byName.subNavPath
  }

  return list[0]?.subNavPath || FALLBACK_WINE_SUB_NAV_PATH
}

export function buildWineGridRoute(options = {}) {
  const subNav = resolveWineSubNavPath(options)
  return {
    name: WINE_GRID_ROUTE_NAME,
    params: { subNav },
  }
}

export function isLegacyWineRegionRouteName(name) {
  return isLegacyRegionRoute(name)
}

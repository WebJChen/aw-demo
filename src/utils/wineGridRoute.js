import navData from '@/data/split/nav.json'
import wineCatalog from '@/data/split/wine/tasmania.json'

export const WINE_GRID_ROUTE_NAME = 'WineGrid'
export const FALLBACK_WINE_SUB_NAV_PATH = 'red-wine'

/** 酒款子分类与路径以首州 wine 子导航为基准（八州一致） */
export function getWineSubNavCatalog() {
  return wineCatalog?.subNavList || []
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
    params: { subNav }
  }
}

export function isLegacyWineRegionRouteName(name) {
  if (typeof name !== 'string' || !name) return false
  return navData.some((region) => region.path === name)
}

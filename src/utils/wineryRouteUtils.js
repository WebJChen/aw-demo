/** 酒庄类目子导航路径（与酒款网格 /wine/:subNav 区分） */
export const WINERY_LEGACY_SUB_NAV = 'wine'
export const WINERY_DEFAULT_SUB_NAV = 'wineries'

export function resolveWinerySubNavPath(subNavPath, region) {
  const raw = String(subNavPath || '').trim()
  if (raw === WINERY_LEGACY_SUB_NAV) return WINERY_DEFAULT_SUB_NAV

  const enabled = (region?.subNavList || []).filter((subNav) => subNav?.isShow !== false)
  if (raw && enabled.some((subNav) => subNav.subNavPath === raw)) return raw
  return enabled[0]?.subNavPath || WINERY_DEFAULT_SUB_NAV
}

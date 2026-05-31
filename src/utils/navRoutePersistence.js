import navData from '@/data/split/nav.json'
import { useNavStore } from '@/stores/navStore'

const findRegionByPath = (path) => navData.find((region) => region.path === path)

/**
 * 记录酒款网格 / 酒庄页最后访问路由，供根路径恢复。
 */
export function attachNavRoutePersistence(router, catalogRouteNames) {
  router.afterEach((to) => {
    if (!catalogRouteNames?.has?.(to.name)) return

    const navStore = useNavStore()
    const params = {}

    if (to.name === 'WineryPreview' || to.name === 'WineryDetail') {
      if (typeof to.params.regionPath === 'string' && to.params.regionPath) {
        params.regionPath = to.params.regionPath
      }
      if (typeof to.params.subNav === 'string' && to.params.subNav) {
        params.subNav = to.params.subNav
      }
      if (to.name === 'WineryDetail' && typeof to.params.itemIndex === 'string' && to.params.itemIndex) {
        params.itemIndex = to.params.itemIndex
      }
      const region = findRegionByPath(params.regionPath)
      if (region?.navName) navStore.setActiveNav(region.navName)
    } else {
      if (typeof to.params.subNav === 'string' && to.params.subNav) {
        params.subNav = to.params.subNav
      }
    }

    navStore.setLastVisitedRoute({ name: to.name, params })
  })
}

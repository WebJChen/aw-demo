import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useNavStore = defineStore('nav', () => {
  const activeNav = ref('塔斯马尼亚州')
  const activeSubNav = ref('红酒')
  const activeCategoryType = ref('葡萄酒酒庄')
  const scrollY = ref(0)
  /** 上次访问的酒款/酒庄 catalog 路由，用于从根路径恢复 */
  const lastVisitedRoute = ref(null)

  let throttleTimer = null
  let pendingScrollY = null

  const setActiveNav = (nav) => {
    activeNav.value = nav || '塔斯马尼亚州'
  }

  const setActiveSubNav = (subNav) => {
    activeSubNav.value = subNav || ''
  }

  const setActiveCategoryType = (categoryType) => {
    activeCategoryType.value = categoryType || '葡萄酒酒庄'
  }

  const setScrollY = (value) => {
    scrollY.value = Math.max(0, Number(value) || 0)
  }

  // 节流保存滚动位置，避免频繁写入持久化存储
  const saveScrollYThrottled = (value, wait = 200) => {
    pendingScrollY = Math.max(0, Number(value) || 0)
    if (throttleTimer) return

    throttleTimer = setTimeout(() => {
      if (pendingScrollY !== null) {
        scrollY.value = pendingScrollY
      }
      pendingScrollY = null
      throttleTimer = null
    }, wait)
  }

  const flushScrollY = () => {
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    if (pendingScrollY !== null) {
      scrollY.value = pendingScrollY
      pendingScrollY = null
    }
  }

  const setLastVisitedRoute = (routeLike) => {
    const name = routeLike?.name
    if (!name || typeof name !== 'string') return
    const params = routeLike?.params && typeof routeLike.params === 'object'
      ? { ...routeLike.params }
      : {}
    lastVisitedRoute.value = { name, params }
  }

  return {
    activeNav,
    activeSubNav,
    activeCategoryType,
    scrollY,
    lastVisitedRoute,
    setActiveNav,
    setActiveSubNav,
    setActiveCategoryType,
    setScrollY,
    saveScrollYThrottled,
    flushScrollY,
    setLastVisitedRoute
  }
}, {
  persist: true
})

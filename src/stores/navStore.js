import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useNavStore = defineStore('nav', () => {
  const activeNav = ref('塔斯马尼亚州')
  const activeSubNav = ref('红酒')
  const scrollY = ref(0)

  let throttleTimer = null
  let pendingScrollY = null

  const setActiveNav = (nav) => {
    activeNav.value = nav || '塔斯马尼亚州'
  }

  const setActiveSubNav = (subNav) => {
    activeSubNav.value = subNav || ''
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

  return {
    activeNav,
    activeSubNav,
    scrollY,
    setActiveNav,
    setActiveSubNav,
    setScrollY,
    saveScrollYThrottled,
    flushScrollY
  }
}, {
  persist: true
})

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useDeviceStore = defineStore('device', () => {
  // 统一维护当前窗口宽度，避免组件内重复写判断逻辑
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

  // 统一维护屏幕方向（主要给移动端分页等场景使用）
  const isPortrait = ref(
    typeof window !== 'undefined'
      ? window.matchMedia('(orientation: portrait)').matches
      : false
  )

  // 按当前项目断点：<=1024 视为移动端（手机 + 平板）
  const isMobile = computed(() => windowWidth.value <= 1024)
  const isPhone = computed(() => windowWidth.value <= 768)
  const isTablet = computed(() => windowWidth.value > 768 && windowWidth.value <= 1024)
  const isPc = computed(() => windowWidth.value > 1024)

  let activeCount = 0

  // resize 时同步窗口宽度与方向
  const updateDeviceInfo = () => {
    if (typeof window === 'undefined') return
    windowWidth.value = window.innerWidth
    isPortrait.value = window.matchMedia('(orientation: portrait)').matches
  }

  // 组件挂载时调用：首次订阅才真正绑定监听
  const startListen = () => {
    if (typeof window === 'undefined') return
    activeCount += 1
    if (activeCount === 1) {
      updateDeviceInfo()
      window.addEventListener('resize', updateDeviceInfo)
    }
  }

  // 组件卸载时调用：最后一个订阅解除后移除监听
  const stopListen = () => {
    if (typeof window === 'undefined') return
    activeCount = Math.max(0, activeCount - 1)
    if (activeCount === 0) {
      window.removeEventListener('resize', updateDeviceInfo)
    }
  }

  return {
    windowWidth,
    isPortrait,
    isMobile,
    isPhone,
    isTablet,
    isPc,
    startListen,
    stopListen
  }
})

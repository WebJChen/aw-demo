import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useLoadingStore = defineStore('loading', () => {
  const pendingCount = ref(0)
  const fullscreenLoading = computed(() => pendingCount.value > 0)

  const startLoading = () => {
    pendingCount.value += 1
  }

  const stopLoading = () => {
    pendingCount.value = Math.max(0, pendingCount.value - 1)
  }

  const resetLoading = () => {
    pendingCount.value = 0
  }

  return {
    pendingCount,
    fullscreenLoading,
    startLoading,
    stopLoading,
    resetLoading
  }
})

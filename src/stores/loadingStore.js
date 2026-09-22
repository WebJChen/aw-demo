import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useLoadingStore = defineStore('loading', () => {
  const pendingCount = ref(0)
  const loadingTextStack = ref([])
  const loadingText = ref('加载中...')
  const fullscreenLoading = computed(() => pendingCount.value > 0)

  const startLoading = (text = '加载中...') => {
    pendingCount.value += 1
    const normalizedText = String(text || '').trim() || '加载中...'
    loadingTextStack.value.push(normalizedText)
    loadingText.value = normalizedText
  }

  const stopLoading = () => {
    pendingCount.value = Math.max(0, pendingCount.value - 1)
    if (loadingTextStack.value.length > 0) {
      loadingTextStack.value.pop()
    }
    loadingText.value = loadingTextStack.value[loadingTextStack.value.length - 1] || '加载中...'
  }

  const resetLoading = () => {
    pendingCount.value = 0
    loadingTextStack.value = []
    loadingText.value = '加载中...'
  }

  return {
    pendingCount,
    fullscreenLoading,
    loadingText,
    startLoading,
    stopLoading,
    resetLoading
  }
})

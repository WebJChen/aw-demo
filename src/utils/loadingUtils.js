import { useLoadingStore } from '@/stores/loadingStore'

const withLoading = async (task, options = {}) => {
  const { text = '加载中...' } = options
  const loadingStore = useLoadingStore()
  loadingStore.startLoading(text)
  try {
    return await Promise.resolve(typeof task === 'function' ? task() : undefined)
  } finally {
    loadingStore.stopLoading()
  }
}

export { withLoading }

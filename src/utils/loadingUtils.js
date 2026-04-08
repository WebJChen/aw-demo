import { useLoadingStore } from '@/stores/loadingStore'

const clampNumber = (value, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const getRandomDelay = (min = 80, max = 300) => {
  const safeMin = Math.max(0, clampNumber(min, 80))
  const safeMax = Math.max(safeMin, clampNumber(max, 300))
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))

const withRandomLoading = async (task, options = {}) => {
  const { min = 80, max = 300 } = options
  const loadingStore = useLoadingStore()
  loadingStore.startLoading()
  try {
    const delayMs = getRandomDelay(min, max)
    const taskPromise = typeof task === 'function' ? Promise.resolve(task()) : Promise.resolve()
    await Promise.all([taskPromise, sleep(delayMs)])
  } finally {
    loadingStore.stopLoading()
  }
}

export { withRandomLoading }

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const FIRST_VISIT_KEY = 'isFirstVisit'
const SEARCH_HIT_DONE_EVENT = 'auswine:search-hit-done'
const route = useRoute()

const showTipsModal = ref(false)
const dontShowAgain = ref(false)
let onSearchHitDone = null

const hasHitParamInCurrentUrl = () => {
  if (typeof window === 'undefined') return false

  // 优先读路由对象
  if (typeof route.query.hit === 'string' && route.query.hit.length > 0) return true

  // 兜底读真实 URL（兼容 hash 路由下路由对象尚未同步的瞬间）
  try {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('hit')) return true

    const hash = window.location.hash || ''
    const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
    if (!hashQuery) return false
    const hashParams = new URLSearchParams(hashQuery)
    return Boolean(hashParams.get('hit'))
  } catch (_) {
    return false
  }
}

const isFirstVisit = () => {
  if (typeof window === 'undefined') return false
  try {
    const value = localStorage.getItem(FIRST_VISIT_KEY)
    return value !== 'false'
  } catch (_) {
    return true
  }
}

const saveFirstVisitState = (isFirstVisitValue) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FIRST_VISIT_KEY, String(isFirstVisitValue))
  } catch (_) {
    // ignore write failures in private mode
  }
}

const acceptTips = () => {
  // 仅“确定”：仍视为首次访问(true)；勾选“不再提示”才改为 false
  saveFirstVisitState(!dontShowAgain.value)
  showTipsModal.value = false
}

onMounted(() => {
  if (!isFirstVisit()) return

  const isSearchHitFlow = hasHitParamInCurrentUrl()
  if (!isSearchHitFlow) {
    showTipsModal.value = true
    return
  }

  // 搜索命中流程优先：等待定位完成后再延迟 200ms 展示提示
  onSearchHitDone = () => {
    setTimeout(() => {
      if (isFirstVisit()) showTipsModal.value = true
    }, 400)
  }
  window.addEventListener(SEARCH_HIT_DONE_EVENT, onSearchHitDone, { once: true })
})

onUnmounted(() => {
  if (onSearchHitDone) {
    window.removeEventListener(SEARCH_HIT_DONE_EVENT, onSearchHitDone)
    onSearchHitDone = null
  }
})
</script>

<template>
  <el-dialog v-model="showTipsModal" append-to-body align-center width="520px" :close-on-click-modal="false"
    :show-close="false" :z-index="9999">
    <template #header>
      <div style="font-weight:700; letter-spacing:2px; color:#101010;">温馨提示</div>
    </template>
    <div style="color:#333; line-height:1.8; text-align:justify;">
      温馨提示，本网站仍在建立之中，内容仍未完善，TasTrips.Online正在尽全力建设中，敬请期待。
    </div>
    <template #footer>
      <div style="display:flex; justify-content:flex-end; gap:16px; align-items:center;">
        <div style="display:flex; align-items:center; gap:4px;">
          <el-checkbox v-model="dontShowAgain" label="不再提示" size="small"></el-checkbox>
        </div>
        <el-button type="primary" @click="acceptTips">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss"></style>
<script setup>
import { onMounted, ref } from 'vue'

const FIRST_VISIT_KEY = 'isFirstVisit'

const showTipsModal = ref(false)
const dontShowAgain = ref(false)

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
  showTipsModal.value = isFirstVisit()
})
</script>

<template>
  <el-dialog v-model="showTipsModal" append-to-body align-center width="520px" :close-on-click-modal="false"
    :show-close="false" :z-index="9999">
    <template #header>
      <div style="font-weight:700; letter-spacing:2px; color:#101010;">温馨提示</div>
    </template>
    <div style="color:#333; line-height:1.8; text-align:justify;">
      温馨提示，本网站仍在建立之中，内容仍未完善，AusWine.com正在尽全力建设中，敬请期待。
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
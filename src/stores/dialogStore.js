import { reactive } from 'vue'
import { defineStore } from 'pinia'

export const useDialogStore = defineStore('dialog', () => {
  //敬请期待弹窗
  const dialogs = reactive({
    comingSoon: { show: false },
    aboutUs: { show: false },
    joinUs: { show: false },
    contactUs: { show: false },
  })

  const ensureDialogState = (name) => {
    // 兼容持久化历史数据缺少新字段的场景
    if (!dialogs[name]) {
      dialogs[name] = { show: false }
    }
  }

  const openDialog = (name) => {
    ensureDialogState(name)
    dialogs[name].show = true
  }
  const closeDialog = (name) => {
    ensureDialogState(name)
    dialogs[name].show = false
  }

  return {
    dialogs, openDialog, closeDialog
  }
}, {
  persist: true
})
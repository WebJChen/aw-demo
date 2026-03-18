import { reactive } from 'vue'
import { defineStore } from 'pinia'

export const useDialogStore = defineStore('dialog', () => {
  //敬请期待弹窗
  const dialogs = reactive({
    comingSoon: { show: false },
    aboutUs: { show: false },
    joinUs: { show: false },
    contactUs: { show: false },
    refundPolicy: { show: false },
    disclaimer: { show: false },
    privacyPolicy: { show: false },
    termsAndConditions: { show: false },
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

  // 仅打开目标弹窗，其余弹窗统一关闭（适合全局弹窗互斥场景）
  const openOnly = (name) => {
    Object.keys(dialogs).forEach((key) => {
      ensureDialogState(key)
      dialogs[key].show = key === name
    })
  }

  const closeDialog = (name) => {
    ensureDialogState(name)
    dialogs[name].show = false
  }

  return {
    dialogs, openDialog, openOnly, closeDialog
  }
})
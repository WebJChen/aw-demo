import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'

export const useDialogStore = defineStore('dialog', () => {
  //敬请期待弹窗
  const dialogs = reactive({
    comingSoon: { show: false }
  })

  const openDialog = (name) => {
    dialogs[name].show = true
  }
  const closeDialog = (name) => {
    dialogs[name].show = false
  }

  return {
    dialogs, openDialog, closeDialog
  }
}, {
  persist: true
})
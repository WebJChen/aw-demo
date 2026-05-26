import { ref } from 'vue'
import { defineStore } from 'pinia'

/** 前台模拟账号：点击「登录」即写入本地，无后端鉴权；对接真实登录后替换为本 store 的请求逻辑即可 */
export const useUserStore = defineStore(
  'user',
  () => {
    const loggedIn = ref(false)
    /** 模拟登录后展示的用户编号 */
    const userId = ref('')

    const loginDemo = () => {
      if (!userId.value) {
        userId.value = `AU_${Date.now().toString(36)}`
      }
      loggedIn.value = true
    }

    const logout = () => {
      loggedIn.value = false
      userId.value = ''
    }

    return { loggedIn, userId, loginDemo, logout }
  },
  { persist: true }
)

import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchAuthSession,
  isApiEnabled,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '@/utils/auswineApi'
import { useCartStore } from '@/stores/cartStore'

/** 登录：API 模式走 /auth/*；否则本地模拟 */
export const useUserStore = defineStore(
  'user',
  () => {
    const loggedIn = ref(false)
    const userId = ref('')
    const username = ref('')

    const applySession = (session) => {
      if (session?.userId != null) {
        loggedIn.value = true
        userId.value = String(session.userId)
        username.value = String(session.username || session.userId || '')
        return true
      }
      loggedIn.value = false
      userId.value = ''
      username.value = ''
      return false
    }

    const loginDemo = () => {
      if (!userId.value) {
        userId.value = `AU_${Date.now().toString(36)}`
      }
      loggedIn.value = true
      username.value = userId.value
    }

    const login = async (account, password) => {
      if (!isApiEnabled()) {
        loginDemo()
        return { userId: userId.value, username: username.value }
      }
      const data = await loginAccount(account, password)
      applySession(data)
      await useCartStore().loadFromRemote()
      return data
    }

    const register = async (payload) => {
      if (!isApiEnabled()) {
        loginDemo()
        return { userId: userId.value, username: username.value }
      }
      const data = await registerAccount(payload)
      applySession(data)
      await useCartStore().loadFromRemote()
      return data
    }

    const logout = async () => {
      if (isApiEnabled()) {
        try {
          await logoutAccount()
        } catch {
          // ignore network errors on logout
        }
      }
      loggedIn.value = false
      userId.value = ''
      username.value = ''
    }

    const restoreSession = async () => {
      if (!isApiEnabled()) return false
      try {
        const data = await fetchAuthSession()
        const ok = applySession(data)
        if (ok) {
          await useCartStore().loadFromRemote()
        }
        return ok
      } catch {
        applySession(null)
        return false
      }
    }

    return {
      loggedIn,
      userId,
      username,
      loginDemo,
      login,
      register,
      logout,
      restoreSession,
    }
  },
  { persist: true }
)

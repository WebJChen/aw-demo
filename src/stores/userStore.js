import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchAuthSession,
  isApiEnabled,
  loginAccount,
  logoutAccount,
  registerAccount,
  registerTokenRefreshHandler,
} from '@/utils/auswineApi'
import { clearAuthToken, getAuthToken, persistAuthToken } from '@/utils/authToken'
import { useCartStore } from '@/stores/cartStore'

/** 登录：API 模式走 /auth/*；否则本地模拟 */
export const useUserStore = defineStore(
  'user',
  () => {
    const loggedIn = ref(false)
    const userId = ref('')
    const username = ref('')
    const displayName = ref('')

    const applySession = (session, { keepToken = false } = {}) => {
      if (session?.userId != null) {
        loggedIn.value = true
        userId.value = String(session.userId)
        username.value = String(session.username || session.userId || '')
        displayName.value = String(session.displayName || session.display_name || session.username || session.userId || '')
        if (session.token) {
          persistAuthToken(session.token)
        } else if (!keepToken) {
          persistAuthToken(getAuthToken())
        }
        return true
      }
      loggedIn.value = false
      userId.value = ''
      username.value = ''
      displayName.value = ''
      if (!keepToken) {
        clearAuthToken()
      }
      return false
    }

    registerTokenRefreshHandler(persistAuthToken)

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
      try {
        await useCartStore().loadFromRemote()
      } catch {
        // 登录成功后同步购物车失败，不阻断登录主流程
      }
      return data
    }

    const register = async (payload) => {
      if (!isApiEnabled()) {
        loginDemo()
        return { userId: userId.value, username: username.value }
      }
      const data = await registerAccount(payload)
      applySession(data)
      try {
        await useCartStore().loadFromRemote()
      } catch {
        // 注册成功后同步购物车失败，不阻断登录主流程
      }
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
      displayName.value = ''
      clearAuthToken()
    }

    const restoreSession = async () => {
      if (!isApiEnabled()) return false
      if (!getAuthToken()) {
        applySession(null)
        return false
      }
      try {
        const data = await fetchAuthSession()
        const ok = applySession(data, { keepToken: true })
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
      displayName,
      login,
      register,
      logout,
      restoreSession,
    }
  },
  { persist: true }
)

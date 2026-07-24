import { createApp } from 'vue'
import router, { catalogRouteNames } from './router'
import './styles/fontSizes.css'
import './style.css'
import 'element-plus/es/components/message/style/css'
import App from './App.vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { attachNavRoutePersistence } from '@/utils/navRoutePersistence'
import { preloadFallbackNav, setApiNavCache } from '@/utils/navHelpers'
import { loadNavCatalog } from '@/utils/catalogRepository'
import { useUserStore } from '@/stores/userStore'
import { isApiEnabled } from '@/utils/auswineApi'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
attachNavRoutePersistence(router, catalogRouteNames)
app.use(router)

void preloadFallbackNav().then(async () => {
  if (isApiEnabled()) {
    try {
      const nav = await loadNavCatalog()
      setApiNavCache(nav)
    } catch (error) {
      console.error('[auswine] failed to preload nav from API', error)
    }
    const userStore = useUserStore()
    void userStore.restoreSession()
  }
  app.mount('#app')
})

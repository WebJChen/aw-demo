import { createApp } from 'vue'
import router, { catalogRouteNames } from './router'
import './styles/fontSizes.css'
import './style.css'
import 'element-plus/es/components/message/style/css'
import App from './App.vue'
//pinia
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { attachNavRoutePersistence } from '@/utils/navRoutePersistence'


const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)


app.use(pinia)
attachNavRoutePersistence(router, catalogRouteNames)
app.use(router)
app.mount('#app')

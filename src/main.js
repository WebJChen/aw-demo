import { createApp } from 'vue'
import router from './router'
import './styles/fontSizes.css'
import './style.css'
import 'element-plus/es/components/message/style/css'
import App from './App.vue'
//pinia
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'


const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)


app.use(router)
app.use(pinia)
app.mount('#app')

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'
import './styles/index.css'
import { getCurrentLocation } from '@/utils/location'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Vant)
app.mount('#app')

getCurrentLocation().catch(err => {
  console.warn('获取位置失败:', err.message)
})

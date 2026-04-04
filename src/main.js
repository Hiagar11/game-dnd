import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './assets/styles/main.scss'
import App from './App.vue'

const app = createApp(App)

// Подключаем Pinia — менеджер состояния
app.use(createPinia())

// Подключаем Vue Router — навигация между страницами
app.use(router)

app.mount('#app')

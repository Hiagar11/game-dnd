// Vue Router — управляет навигацией между страницами (views) без перезагрузки браузера.
// createRouter — создаёт экземпляр роутера.
// createWebHistory — использует History API браузера (красивые URL без #).
import { createRouter, createWebHistory } from 'vue-router'

// Каждый объект в массиве routes описывает один маршрут:
// path  — URL путь
// name  — имя маршрута (удобно для навигации через { name: '...' })
// component — какой компонент показывать по этому пути

const routes = [
  {
    path: '/',
    name: 'menu',
    // lazy import: компонент загружается только когда пользователь заходит на эту страницу
    component: () => import('../views/MenuView.vue'),
  },
  {
    path: '/game',
    name: 'game',
    // lazy import: компонент загружается только когда пользователь заходит на эту страницу
    component: () => import('../views/GameView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router

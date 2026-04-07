import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// meta.public — доступен без авторизации
// meta.role   — ограничивает доступ по роли: 'admin' | 'player'
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'menu',
    component: () => import('../views/MenuView.vue'),
  },
  {
    path: '/game',
    name: 'game',
    component: () => import('../views/GameView.vue'),
    meta: { role: 'admin' },
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: () => import('../views/PlayerLobbyView.vue'),
    meta: { role: 'player' },
  },
  {
    path: '/viewer/:sessionId',
    name: 'viewer',
    component: () => import('../views/ViewerView.vue'),
    meta: { role: 'player' },
  },
  {
    path: '/editor',
    name: 'editor',
    component: () => import('../views/ScenarioEditorView.vue'),
    meta: { role: 'admin' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ─── Navigation guard ────────────────────────────────────────────────────
// Порядок проверок:
//   1. Если маршрут публичный — пропускаем.
//   2. Если не авторизован — пытаемся восстановить сессию, иначе — на /login.
//   3. Если маршрут требует определённую роль и роль не совпадает — на /login.
router.beforeEach(async (to) => {
  if (to.meta.public) return true

  const auth = useAuthStore()

  // Если пользователь не загружен — восстанавливаем сессию.
  // Это происходит при перезагрузке страницы: токен есть в storage,
  // но user ещё null (store не помнит данные между перезагрузками).
  if (!auth.user) {
    const ok = await auth.restoreSession()
    if (!ok) return { name: 'login' }
  }

  // Проверка роли: если маршрут требует admin, а у пользователя роль player — отправляем назад.
  if (to.meta.role && to.meta.role !== auth.role) {
    return { name: 'login' }
  }

  return true
})

export default router

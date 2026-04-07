<template>
  <div class="lobby">
    <AppBackground src="/video/mainBackground.mp4" :brightness="0.8" />

    <div class="lobby__panel">
      <router-link class="lobby__back" :to="{ name: 'menu' }">← Меню</router-link>

      <h2 class="lobby__title">Активные игры</h2>

      <p v-if="loading" class="lobby__hint">Подключение…</p>

      <p v-else-if="connectError" class="lobby__error">{{ connectError }}</p>

      <p v-else-if="!sessions.length" class="lobby__hint">
        Ни одной игры пока нет. Подождите, пока Мастер начнёт сессию.
      </p>

      <ul v-else class="lobby__list">
        <li v-for="s in sessions" :key="s.sessionId" class="lobby__item">
          <div class="lobby__info">
            <span class="lobby__campaign">{{ s.campaignName }}</span>
            <span class="lobby__master">Мастер: {{ s.adminName }}</span>
          </div>
          <button class="lobby__join" @click="joinSession(s)">Войти</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  import { useSocket } from '../composables/useSocket'
  import AppBackground from '../components/AppBackground.vue'

  const router = useRouter()
  const auth = useAuthStore()
  const { connect, getSocket } = useSocket()

  const sessions = ref([])
  const loading = ref(true)
  const connectError = ref('')

  function fetchSessions(socket) {
    socket.emit('game:sessions:list', (res) => {
      if (res?.ok) sessions.value = res.sessions
      loading.value = false
    })
  }

  onMounted(() => {
    const socket = connect(auth.token)

    // Если сокет уже подключён (переход назад/вперёд) — запрашиваем сразу.
    // Иначе ждём событие connect: эмит до подключения может потерять ack при ошибке.
    if (socket.connected) {
      fetchSessions(socket)
    } else {
      socket.once('connect', () => fetchSessions(socket))
    }

    // Ошибка подключения (JWT невалидный, сервер недоступен и т.д.)
    socket.once('connect_error', (err) => {
      connectError.value = `Не удалось подключиться: ${err.message}`
      loading.value = false
    })

    // Подписываемся на обновления в реальном времени
    socket.on('sessions:updated', (list) => {
      sessions.value = list
    })
  })

  onUnmounted(() => {
    const socket = getSocket()
    socket?.off('sessions:updated')
    socket?.off('connect_error')
  })

  function joinSession(session) {
    router.push({
      name: 'viewer',
      params: { sessionId: session.sessionId },
      // scenarioId в query — ViewerView загрузит карту через REST до подключения сокета
      query: { scenarioId: session.scenarioId },
    })
  }
</script>

<style scoped>
  .lobby {
    position: relative;
    width: 100vw;
    height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-ui);
    color: var(--color-text);
  }

  .lobby__panel {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-8);
    min-width: 360px;
    max-width: 520px;
    width: 100%;
  }

  .lobby__back {
    align-self: flex-start;
    font-size: 13px;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-primary);
    }
  }

  .lobby__title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .lobby__hint {
    margin: 0;
    font-size: 14px;
    color: var(--color-text-muted);
  }

  .lobby__error {
    margin: 0;
    font-size: 14px;
    color: var(--color-danger, #e55);
  }

  .lobby__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .lobby__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .lobby__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .lobby__campaign {
    font-size: 15px;
    font-weight: 600;
  }

  .lobby__master {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .lobby__join {
    flex-shrink: 0;
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transition-fast);

    &:hover {
      background: var(--color-primary-dark);
    }
  }
</style>

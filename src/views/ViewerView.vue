<template>
  <div class="viewer-view">
    <AppBackground src="/video/maw.gif" />

    <!-- Состояние: подключение / ошибка -->
    <div v-if="!ready" class="viewer-view__status">
      <p v-if="joinError" class="viewer-view__error">{{ joinError }}</p>
      <p v-else class="viewer-view__hint">Подключение к игре…</p>
    </div>

    <!-- Игровое поле — только карта, сетка, токены, туман -->
    <template v-if="ready">
      <div
        ref="mapRef"
        class="viewer-view__map"
        :style="{ transform: `translate(${offsetX}px, ${offsetY}px)` }"
      >
        <GameMap :map-src="mapSrc" @ready="onMapReady" />
        <GameGrid :width="mapSize.width" :height="mapSize.height" />
        <GameTokens :width="mapSize.width" :height="mapSize.height" :viewer-mode="true" />
        <GameFog :width="mapSize.width" :height="mapSize.height" />
      </div>
    </template>

    <!-- Кнопка выхода — всегда видна -->
    <router-link class="viewer-view__back" :to="{ name: 'lobby' }">← Выйти</router-link>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  import { useSocket } from '../composables/useSocket'
  import { useViewerSync } from '../composables/useViewerSync'
  import { useGameStore } from '../stores/game'
  import { useTokensStore } from '../stores/tokens'
  import { useScenariosStore } from '../stores/scenarios'
  import AppBackground from '../components/AppBackground.vue'
  import GameMap from '../components/GameMap.vue'
  import GameGrid from '../components/GameGrid.vue'
  import GameFog from '../components/GameFog.vue'
  import GameTokens from '../components/GameTokens.vue'

  const route = useRoute()
  const auth = useAuthStore()
  const { connect } = useSocket()
  const gameStore = useGameStore()
  const tokensStore = useTokensStore()
  const scenariosStore = useScenariosStore()

  const mapRef = ref(null)
  const mapSize = ref({ width: 0, height: 0 })
  const mapSrc = ref('')
  const ready = ref(false)
  const joinError = ref('')

  // Камера — управляется через useViewerSync (получает game:panned)
  const socket = connect(auth.token)
  const { offsetX, offsetY, attach, detach, onScenarioChange } = useViewerSync(socket)

  // При смене локации (мастер прошёл в дверь) — перезагружаем карту
  onScenarioChange(async (scenarioId) => {
    ready.value = false
    mapSize.value = { width: 0, height: 0 }
    await loadScenario(scenarioId)
  })

  onMounted(async () => {
    const sessionId = route.params.sessionId

    // 1. Загружаем определения токенов — нужны для initPlacedTokens
    await tokensStore.fetchTokens()

    // 2. Входим в сессию: получаем offsetX/offsetY + scenarioId
    socket.emit('game:session:join', { sessionId }, async (res) => {
      if (!res?.ok) {
        joinError.value = res?.error ?? 'Не удалось войти в сессию'
        return
      }

      // Инициализируем начальную позицию камеры из текущего состояния мастера
      offsetX.value = res.session.offsetX
      offsetY.value = res.session.offsetY

      // 3. Загружаем карту из REST API (уже фильтрует скрытые токены для игроков)
      await loadScenario(res.session.scenarioId)

      // 4. Подписываемся на обновления в реальном времени
      attach()
    })
  })

  onUnmounted(() => {
    detach()
    gameStore.currentScenario = null
  })

  async function loadScenario(scenarioId) {
    try {
      const full = await scenariosStore.fetchScenario(scenarioId)
      gameStore.setCellSize(full.cellSize ?? 60)
      gameStore.initPlacedTokens(full.placedTokens ?? [])
      gameStore.currentScenario = full
      mapSrc.value = full.mapImageUrl ?? ''
      ready.value = true
    } catch (err) {
      joinError.value = err.message || 'Не удалось загрузить карту'
    }
  }

  function onMapReady(canvas) {
    mapSize.value = { width: canvas.width, height: canvas.height }
    if (mapRef.value) {
      mapRef.value.style.width = `${canvas.width}px`
      mapRef.value.style.height = `${canvas.height}px`
    }
  }
</script>

<style scoped>
  .viewer-view {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    font-family: var(--font-ui);
    color: var(--color-text);
  }

  .viewer-view__map {
    position: absolute;
    top: 0;
    left: 0;
    will-change: transform;
  }

  .viewer-view__status {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .viewer-view__hint,
  .viewer-view__error {
    font-size: 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4) var(--space-6);
  }

  .viewer-view__error {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  .viewer-view__back {
    position: fixed;
    top: var(--space-4);
    left: var(--space-4);
    z-index: 10;
    font-size: 13px;
    color: var(--color-text-muted);
    text-decoration: none;
    background: color-mix(in srgb, var(--color-surface) 80%, transparent);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-primary);
    }
  }
</style>

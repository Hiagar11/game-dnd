<template>
  <div class="viewer-view">
    <AppBackground src="/video/maw.gif" />

    <!-- Загрузка / ошибка -->
    <div v-if="!ready" class="viewer-view__status">
      <p v-if="joinError" class="viewer-view__error">{{ joinError }}</p>
      <p v-else class="viewer-view__hint">Загрузка…</p>
    </div>

    <!-- Игровое поле -->
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

    <router-link class="viewer-view__back" :to="{ name: 'lobby' }">← Выйти</router-link>

    <!-- Меню зрителя: список героев от мастера (видно всегда, даже пока карта загружается) -->
    <ViewerMenu />

    <!-- Курсор мастера — виден только зрителям (Teleport внутри компонента монтирует в body) -->
    <AdminCursorOverlay
      :map-x="cursorMapX"
      :map-y="cursorMapY"
      :offset-x="offsetX"
      :offset-y="offsetY"
      :icon-url="cursorIconUrl"
    />
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  import { useSocket } from '../composables/useSocket'
  import { useViewerSync } from '../composables/useViewerSync'
  import { useGameStore } from '../stores/game'
  import { useHeroesStore } from '../stores/heroes'
  import { useScenariosStore } from '../stores/scenarios'
  import { SYSTEM_TOKENS } from '../constants/systemTokens'
  import AppBackground from '../components/AppBackground.vue'
  import GameMap from '../components/GameMap.vue'
  import GameGrid from '../components/GameGrid.vue'
  import GameFog from '../components/GameFog.vue'
  import GameTokens from '../components/GameTokens.vue'
  import AdminCursorOverlay from '../components/AdminCursorOverlay.vue'
  import ViewerMenu from '../components/ViewerMenu.vue'

  // Базовый URL сервера — для построения imageUrl из imagePath
  const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

  const route = useRoute()
  const auth = useAuthStore()
  const { connect } = useSocket()
  const gameStore = useGameStore()
  const heroesStore = useHeroesStore()
  const scenariosStore = useScenariosStore()

  const mapRef = ref(null)
  const mapSize = ref({ width: 0, height: 0 })
  const mapSrc = ref('')
  const ready = ref(false)
  const joinError = ref('')

  const socket = connect(auth.token)
  const {
    offsetX,
    offsetY,
    cursorMapX,
    cursorMapY,
    cursorIconUrl,
    attach,
    detach,
    onScenarioChange,
  } = useViewerSync(socket)

  // Мастер перешёл в другую локацию через дверь
  onScenarioChange(async (scenarioId) => {
    ready.value = false
    mapSize.value = { width: 0, height: 0 }
    await loadScenario(scenarioId)
  })

  onMounted(async () => {
    const sessionId = route.params.sessionId
    // scenarioId передаётся из лобби через query-параметр —
    // это позволяет загрузить карту через REST ДО подключения сокета.
    const scenarioIdFromRoute = route.query.scenarioId

    // ШАГ 1 — загружаем карту и токены через REST.
    // Не зависит от сокета: карта появится даже при задержке соединения.
    if (scenarioIdFromRoute) {
      await loadScenario(scenarioIdFromRoute)
    }

    // ШАГ 2 — подключаемся к сокету для синхронизации камеры и live-обновлений.
    function joinSession() {
      socket.emit('game:session:join', { sessionId }, async (res) => {
        if (!res?.ok) {
          // Если карта уже загрузилась — не блокируем экран ошибкой сокета
          if (!ready.value) joinError.value = res?.error ?? 'Не удалось войти в сессию'
          return
        }
        // Синхронизируем камеру: mapCenter → offset под размер экрана зрителя.
        // null означает, что мастер ещё не двигал карту — остаёмся в (0, 0).
        if (res.session.mapCenterX !== null) {
          offsetX.value = window.innerWidth / 2 - res.session.mapCenterX
          offsetY.value = window.innerHeight / 2 - res.session.mapCenterY
        }

        // Инициализируем курсор мастера (координаты карты + иконка)
        cursorMapX.value = res.session.cursorMapX ?? null
        cursorMapY.value = res.session.cursorMapY ?? null
        cursorIconUrl.value = res.session.cursorIconDataUrl ?? ''

        // Инициализируем список героев из текущего состояния сессии
        heroesStore.setHeroes(res.session.heroes ?? [])

        // Резервный путь: если scenarioId не было в URL (прямой переход по ссылке)
        if (!scenarioIdFromRoute && !ready.value) {
          await loadScenario(res.session.scenarioId)
        }

        attach()
      })
    }

    if (socket.connected) {
      joinSession()
    } else {
      socket.once('connect', joinSession)
      socket.once('connect_error', (err) => {
        if (!ready.value) joinError.value = `Нет соединения: ${err.message}`
      })
    }
  })

  onUnmounted(() => {
    detach()
    socket.off('connect_error')
    socket.off('connect', undefined)
    gameStore.currentScenario = null
    // Очищаем токены чтобы не было «статики» при переходе на другой маршрут
    gameStore.placedTokens = []
  })

  // ── Загрузка сценария через REST API (без зависимости от tokensStore) ────────
  // Сервер возвращает placedTokens с populate token: { _id, name, imagePath, stats }.
  // Строим src прямо из imagePath — игрок не имеет своих токенов, tokensStore пуст.
  async function loadScenario(scenarioId) {
    try {
      const full = await scenariosStore.fetchScenario(scenarioId)
      gameStore.setCellSize(full.cellSize ?? 60)
      gameStore.placedTokens = buildPlacedTokens(full.placedTokens ?? [])
      gameStore.currentScenario = full
      mapSrc.value = full.mapImageUrl ?? ''
      ready.value = true
    } catch (err) {
      joinError.value = err.message || 'Не удалось загрузить карту'
    }
  }

  // Преобразует populate-данные REST в формат gameStore (без tokensStore)
  function buildPlacedTokens(serverTokens) {
    return serverTokens.map((pt) => {
      if (pt.systemToken) {
        const def = SYSTEM_TOKENS.find((t) => t.id === pt.systemToken)
        return {
          uid: pt.uid,
          tokenId: null,
          systemToken: pt.systemToken,
          targetScenarioId: pt.targetScenarioId ? String(pt.targetScenarioId) : null,
          col: pt.col,
          row: pt.row,
          hidden: false,
          name: def?.name ?? pt.systemToken,
          src: def?.src ?? '',
          meleeDmg: 0,
          rangedDmg: 0,
          visionRange: 0,
          defense: 0,
          evasion: 0,
        }
      }

      // tokenId — populated объект { _id, name, imagePath, stats } из REST
      const tid = pt.tokenId
      return {
        uid: pt.uid,
        tokenId: tid?._id ? String(tid._id) : null,
        col: pt.col,
        row: pt.row,
        hidden: false,
        name: tid?.name ?? 'Неизвестный',
        src: tid?.imagePath ? `${API}/${tid.imagePath}` : '',
        meleeDmg: tid?.stats?.meleeDmg ?? 0,
        rangedDmg: tid?.stats?.rangedDmg ?? 0,
        visionRange: tid?.stats?.visionRange ?? 0,
        defense: tid?.stats?.defense ?? 0,
        evasion: tid?.stats?.evasion ?? 0,
      }
    })
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

    /* Плавная интерполяция между обновлениями от сервера (30fps → визуально 60fps) */
    transition: transform 50ms linear;

    /* Декоративная рамка карты — та же, что в GameView */
    &::after {
      content: '';
      position: absolute;
      inset: calc(-1 * var(--map-border-size));
      z-index: var(--z-map-border);
      pointer-events: none;
      border: var(--map-border-size) solid transparent;
      border-image: url('/systemImage/border.jpg') var(--map-border-slice) round;
      clip-path: inset(0 round var(--map-border-radius));
    }
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

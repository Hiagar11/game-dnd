<template>
  <div class="viewer-view">
    <AppBackground src="/video/maw.gif" />

    <div v-if="!ready" class="viewer-view__status">
      <p v-if="joinError" class="viewer-view__error">{{ joinError }}</p>
      <p v-else class="viewer-view__hint">Загрузка…</p>
    </div>

    <template v-if="ready">
      <div
        ref="mapRef"
        class="viewer-view__map"
        :style="{ transform: `translate(${offsetX}px, ${offsetY}px)` }"
      >
        <GameMap :map-src="mapSrc" @ready="onMapReady" />
        <GameGrid :width="mapSize.width" :height="mapSize.height" :viewer-mode="true" />
        <GameTokens :width="mapSize.width" :height="mapSize.height" :viewer-mode="true" />
        <GameFog :width="mapSize.width" :height="mapSize.height" />
      </div>
    </template>

    <router-link class="viewer-view__back" :to="{ name: 'lobby' }">← Выйти</router-link>

    <ViewerMenu />

    <AdminCursorOverlay
      :map-x="filteredCursorPos.x"
      :map-y="filteredCursorPos.y"
      :offset-x="offsetX"
      :offset-y="offsetY"
      :icon-url="cursorIconUrl"
    />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  import { useSocket } from '../composables/useSocket'
  import { useViewerSync } from '../composables/useViewerSync'
  import { useGameStore } from '../stores/game'
  import { useHeroesStore } from '../stores/heroes'
  import { useScenariosStore } from '../stores/scenarios'
  import { playTravelMusic, stopTravelMusic } from '../composables/useSound'
  import { buildReachableCells } from '../composables/useTokenMove'
  import AppBackground from '../components/AppBackground.vue'
  import GameMap from '../components/GameMap.vue'
  import GameGrid from '../components/GameGrid.vue'
  import GameFog from '../components/GameFog.vue'
  import GameTokens from '../components/GameTokens.vue'
  import AdminCursorOverlay from '../components/AdminCursorOverlay.vue'
  import ViewerMenu from '../components/ViewerMenu.vue'

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

  const filteredCursorPos = computed(() => {
    if (cursorMapX.value === null || cursorMapY.value === null) return { x: null, y: null }
    if (!gameStore.cellSize) return { x: null, y: null }

    const activeUid = heroesStore.adminSelectedUid ?? heroesStore.selectedUid
    if (!activeUid) return { x: null, y: null }

    const heroIds = new Set(heroesStore.heroes.map((h) => h.id))
    const placed = gameStore.placedTokens.find((t) => t.uid === activeUid && heroIds.has(t.tokenId))
    if (!placed) return { x: null, y: null }

    const col = Math.floor((cursorMapX.value - gameStore.gridNormOX) / gameStore.halfCell)
    const row = Math.floor((cursorMapY.value - gameStore.gridNormOY) / gameStore.halfCell)
    const reachable = buildReachableCells(placed, gameStore.walls)

    if (!reachable.has(`${col},${row}`)) return { x: null, y: null }
    return { x: cursorMapX.value, y: cursorMapY.value }
  })

  onScenarioChange(async (scenarioId) => {
    ready.value = false
    mapSize.value = { width: 0, height: 0 }
    heroesStore.selectedUid = null
    heroesStore.adminSelectedUid = null
    await loadScenario(scenarioId)
  })

  onMounted(async () => {
    const sessionId = route.params.sessionId
    const scenarioIdFromRoute = route.query.scenarioId

    if (scenarioIdFromRoute) {
      await loadScenario(scenarioIdFromRoute)
    }

    function joinSession() {
      socket.emit('game:session:join', { sessionId }, async (res) => {
        if (!res?.ok) {
          if (!ready.value) joinError.value = res?.error ?? 'Не удалось войти в сессию'
          return
        }

        if (res.session.mapCenterX !== null) {
          offsetX.value = window.innerWidth / 2 - res.session.mapCenterX
          offsetY.value = window.innerHeight / 2 - res.session.mapCenterY
        }

        cursorMapX.value = res.session.cursorMapX ?? null
        cursorMapY.value = res.session.cursorMapY ?? null
        cursorIconUrl.value = res.session.cursorIconDataUrl ?? ''

        heroesStore.setHeroes(res.session.heroes ?? [])

        heroesStore.adminSelectedUid = res.session.selectedTokenUid ?? null

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
    stopTravelMusic()
    gameStore.currentScenario = null
    gameStore.initPlacedTokens([])
  })

  async function loadScenario(scenarioId) {
    try {
      const full = await scenariosStore.fetchScenario(scenarioId)
      gameStore.setCellSize(full.cellSize ?? 60)
      gameStore.setGridOffset(full.gridOffsetX ?? 0, full.gridOffsetY ?? 0)
      gameStore.initWalls(full.walls ?? [])
      gameStore.initPlacedTokens(full.placedTokens ?? [])
      gameStore.currentScenario = full
      mapSrc.value = full.mapImageUrl ?? ''
      ready.value = true
      playTravelMusic()
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

<style scoped src="../assets/styles/views/viewerView.css"></style>

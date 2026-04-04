<template>
  <div
    ref="viewRef"
    class="game-view"
    @mousemove="onMouseMove"
    @contextmenu="onContextMenu"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <AppBackground src="/video/maw.gif" />

    <!-- ── Состояние 1: выбор карты ──────────────────────────────────────────── -->
    <template v-if="!selectedScenario">
      <div class="game-picker">
        <router-link class="game-picker__back" :to="{ name: 'menu' }">← Меню</router-link>
        <h2 class="game-picker__title">Выберите карту</h2>

        <p v-if="scenariosStore.loading" class="game-picker__hint">Загрузка…</p>
        <p v-else-if="!levels.length" class="game-picker__hint">
          Нет доступных уровней. Мастер должен расставить токены в редакторе.
        </p>

        <div v-else class="game-picker__grid">
          <button
            v-for="s in levels"
            :key="s.id"
            class="game-card"
            :disabled="loadingId === s.id"
            @click="selectScenario(s)"
          >
            <img v-if="s.mapImageUrl" :src="s.mapImageUrl" class="game-card__img" alt="" />
            <div v-else class="game-card__no-img">Нет карты</div>
            <p class="game-card__name">{{ s.name || 'Без названия' }}</p>
            <span v-if="loadingId === s.id" class="game-card__loading">Загрузка…</span>
          </button>
        </div>

        <p v-if="loadError" class="game-picker__error">{{ loadError }}</p>
      </div>
    </template>

    <!-- ── Состояние 2: игровое поле ──────────────────────────────────────────── -->
    <template v-else>
      <div
        ref="mapRef"
        class="game-view__map"
        :style="{ transform: `translate(${offsetX}px, ${offsetY}px)` }"
        @mouseup="onMouseUp"
        @mousedown="onMouseDown"
        @click="(gameStore.selectPlacedToken(null), closeContextMenu())"
      >
        <GameMap :map-src="selectedScenario.mapImageUrl" @ready="onMapReady" />
        <GameGrid :width="mapSize.width" :height="mapSize.height" />
        <GameTokens :width="mapSize.width" :height="mapSize.height" />
        <GameFog :width="mapSize.width" :height="mapSize.height" />
      </div>

      <GameMenu />

      <!-- Кнопка возврата к выбору карты -->
      <button class="game-back" @click="exitGame">← К выбору</button>
    </template>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useMapPan } from '../composables/useMapPan'
  import { useGameStore } from '../stores/game'
  import { useScenariosStore } from '../stores/scenarios'
  import AppBackground from '../components/AppBackground.vue'
  import GameMap from '../components/GameMap.vue'
  import GameGrid from '../components/GameGrid.vue'
  import GameFog from '../components/GameFog.vue'
  import GameTokens from '../components/GameTokens.vue'
  import GameMenu from '../components/GameMenu.vue'
  import { useTokenDrop } from '../composables/useTokenDrop'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'

  const viewRef = ref(null)
  const mapRef = ref(null)
  const canvasRef = ref(null)

  const { offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = useMapPan(
    viewRef,
    canvasRef
  )

  const { onDragOver, onDrop } = useTokenDrop(offsetX, offsetY)
  const { close: closeContextMenu } = useTokenContextMenu()

  const gameStore = useGameStore()
  const scenariosStore = useScenariosStore()

  const mapSize = ref({ width: 0, height: 0 })
  const selectedScenario = ref(null)
  const loadingId = ref(null)
  const loadError = ref('')

  onMounted(() => scenariosStore.fetchScenarios())

  // Только сценарии с расставленными токенами — это готовые уровни для игры
  const levels = computed(() => scenariosStore.scenarios.filter((s) => s.tokensCount > 0))

  // ─── Выбор карты ─────────────────────────────────────────────────────────────
  async function selectScenario(s) {
    loadingId.value = s.id
    loadError.value = ''
    try {
      await gameStore.fetchTokens()
      const full = await scenariosStore.fetchScenario(s.id)
      gameStore.setCellSize(full.cellSize ?? 60)
      gameStore.initPlacedTokens(full.placedTokens ?? [])
      gameStore.currentScenario = full
      selectedScenario.value = full
    } catch (err) {
      loadError.value = err.message || 'Не удалось загрузить карту'
    } finally {
      loadingId.value = null
    }
  }

  function exitGame() {
    selectedScenario.value = null
    gameStore.currentScenario = null
  }

  // GameMap вызывает emit('ready', canvas) когда изображение нарисовано
  const onMapReady = (canvas) => {
    canvasRef.value = canvas
    mapSize.value = { width: canvas.width, height: canvas.height }
    mapRef.value.style.width = `${canvas.width}px`
    mapRef.value.style.height = `${canvas.height}px`
  }
</script>

<style scoped>
  .game-view {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    color: var(--color-text);
    font-family: var(--font-ui);
  }

  /* ─── Экран выбора карты ──────────────────────────────────────────────────── */
  .game-picker {
    position: relative;
    z-index: 1;
    height: 100%;
    overflow-y: auto;
    padding: var(--space-6) var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .game-picker__back {
    align-self: flex-start;
    font-size: 13px;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-primary);
    }
  }

  .game-picker__title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .game-picker__hint {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .game-picker__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-4);
  }

  .game-picker__error {
    font-size: 13px;
    color: #f87171;
  }

  .game-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 40%);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: rgb(255 255 255 / 5%);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.6;
    }
  }

  .game-card__img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }

  .game-card__no-img {
    width: 100%;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(255 255 255 / 4%);
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .game-card__name {
    color: white;
    padding: var(--space-2) var(--space-3);
    font-size: 13px;
    text-align: left;
  }

  .game-card__loading {
    display: block;
    padding: var(--space-1) var(--space-3) var(--space-2);
    font-size: 11px;
    color: var(--color-text-muted);
  }

  /* ─── Игровое поле ────────────────────────────────────────────────────────── */
  .game-view__map {
    position: absolute;
    top: 0;
    left: 0;
    z-index: var(--z-map);
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

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

  /* ─── Кнопка возврата ────────────────────────────────────────────────────── */
  .game-back {
    position: fixed;
    top: var(--space-4);
    left: var(--space-4);
    z-index: 20;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 70%);
    color: var(--color-text-muted);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }
</style>

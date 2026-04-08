<template>
  <div class="level-section">
    <!-- ── Состояние 1: выбор карты ──────────────────────────────────────────── -->
    <LevelPickerList
      v-if="!selectedScenario"
      :maps="maps"
      :levels="levels"
      :loading="store.loading"
      :loading-id="loadingId"
      :load-error="loadError"
      :deleting-id="deletingId"
      :delete-error="deleteError"
      @select-map="selectScenario"
      @edit-level="editLevel"
      @delete-level="onDeleteLevel"
    />

    <!-- ── Состояние 2: fullscreen игровой интерфейс ──────────────────────────── -->
    <template v-else>
      <div
        ref="viewRef"
        class="level-game"
        @mousemove="onMouseMove"
        @contextmenu="onContextMenu"
        @dragover="onDragOver"
        @drop="onDrop"
      >
        <div
          ref="mapRef"
          class="level-game__map"
          :style="{ transform: `translate(${offsetX}px, ${offsetY}px)` }"
          @mouseup="onMouseUp"
          @mousedown="onMouseDown"
          @click="onMapClick"
        >
          <GameMap :map-src="selectedScenario.mapImageUrl" @ready="onMapReady" />
          <GameGrid :width="mapSize.width" :height="mapSize.height" editor-mode />
          <GameTokens :width="mapSize.width" :height="mapSize.height" />
          <GameWallPainter :width="mapSize.width" :height="mapSize.height" />
        </div>

        <GameMenu editor-mode>
          <template #right-panel>
            <div class="level-save">
              <button
                class="level-save__btn"
                :disabled="saving"
                @mouseenter="playHover"
                @click="onSave"
              >
                {{ isEditingLevel ? 'Обновить' : 'Сохранить уровень' }}
              </button>
            </div>
          </template>
        </GameMenu>

        <!-- Попап: имя сохранения ─────────────────────────────────────────── -->
        <LevelSavePopup
          :visible="showSavePopup"
          :model-value="levelName"
          :saving="saving"
          :error="saveError"
          @update:model-value="levelName = $event"
          @save="onSaveLevel"
          @close="closeSavePopup"
        />
      </div>

      <button class="level-back" @mouseenter="playHover" @click="onLevelBack">
        {{ props.autoLoadScenario ? '← К сценарию' : '← К выбору' }}
      </button>
    </template>
  </div>

  <!-- Тост: вне шаблонных веток — виден и на экране выбора, и в игровом интерфейсе -->
  <div v-if="saveSuccess" class="level-toast">{{ saveToastMsg }}</div>
</template>

<script setup>
  import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
  import { useMapPan } from '../composables/useMapPan'
  import { useTokenDrop } from '../composables/useTokenDrop'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'
  import { useLevelSave } from '../composables/useLevelSave'
  import { useSound } from '../composables/useSound'
  import { useGameStore } from '../stores/game'
  import { useTokensStore } from '../stores/tokens'
  import { useScenariosStore } from '../stores/scenarios'
  import GameMap from './GameMap.vue'
  import GameGrid from './GameGrid.vue'
  import GameTokens from './GameTokens.vue'
  import GameWallPainter from './GameWallPainter.vue'
  import GameMenu from './GameMenu.vue'
  import LevelSavePopup from './LevelSavePopup.vue'
  import LevelPickerList from './LevelPickerList.vue'

  const props = defineProps({ autoLoadScenario: { type: Object, default: null } })
  const emit = defineEmits(['back-to-scenario'])

  const store = useScenariosStore()
  const gameStore = useGameStore()
  const tokensStore = useTokensStore()
  const { playHover, playClick } = useSound()

  function onSave() {
    playClick()
    onSaveBtnClick()
  }

  function onLevelBack() {
    playClick()
    props.autoLoadScenario ? goBack() : exitGame()
  }

  const maps = computed(() => store.scenarios.filter((s) => !s.tokensCount))
  const levels = computed(() => store.scenarios.filter((s) => s.tokensCount > 0))

  // ─── Состояние компонента ────────────────────────────────────────────────────
  const selectedScenario = ref(null)
  const mapSize = ref({ width: 0, height: 0 })
  const loadingId = ref(null)
  const loadError = ref('')
  const isEditingLevel = ref(false)
  const deletingId = ref(null)
  const deleteError = ref('')

  // ─── Карта: пан + дропзона ───────────────────────────────────────────────────
  const viewRef = ref(null)
  const mapRef = ref(null)
  const canvasRef = ref(null)

  const { offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = useMapPan(
    viewRef,
    canvasRef
  )
  const { onDragOver, onDrop } = useTokenDrop(offsetX, offsetY)
  const { close: closeContextMenu } = useTokenContextMenu()

  // ─── Навигация ───────────────────────────────────────────────────────────────
  function exitGame() {
    selectedScenario.value = null
    isEditingLevel.value = false
    gameStore.wallMode = false
  }

  function goBack() {
    exitGame()
    gameStore.setActiveCampaign(null)
    emit('back-to-scenario')
  }

  // ─── Логика сохранения (попап + PATCH/POST) ───────────────────────────────────
  const autoLoadRef = computed(() => props.autoLoadScenario)
  const {
    showSavePopup,
    levelName,
    levelNameInputRef,
    saving,
    saveError,
    saveSuccess,
    saveToastMsg,
    closeSavePopup,
    onSaveBtnClick,
    onSaveLevel,
  } = useLevelSave(selectedScenario, isEditingLevel, autoLoadRef, exitGame, goBack)

  // ─── Загрузка сценария (карта + токены) ─────────────────────────────────────
  async function loadScenarioData(s, editMode = false) {
    loadingId.value = s.id
    loadError.value = ''
    try {
      await tokensStore.fetchTokens()
      const full = await store.fetchScenario(s.id)
      gameStore.setCellSize(full.cellSize ?? 60)
      gameStore.initPlacedTokens(full.placedTokens ?? [])
      gameStore.initWalls(full.walls ?? [])
      gameStore.currentScenario = full
      selectedScenario.value = full
      isEditingLevel.value = editMode
    } catch (err) {
      loadError.value = err.message || 'Не удалось загрузить карту'
    } finally {
      loadingId.value = null
    }
  }

  const selectScenario = (s) => loadScenarioData(s, false)
  const editLevel = (s) => loadScenarioData(s, true)

  function onMapReady(canvas) {
    canvasRef.value = canvas
    mapSize.value = { width: canvas.width, height: canvas.height }
    mapRef.value.style.width = `${canvas.width}px`
    mapRef.value.style.height = `${canvas.height}px`
  }

  function onMapClick() {
    gameStore.selectPlacedToken(null)
    closeContextMenu()
  }

  // ─── Удаление уровня ─────────────────────────────────────────────────────────
  async function onDeleteLevel(s) {
    if (
      !confirm(`Удалить уровень «${s.name || 'Без названия'}»?\nОн исчезнет из раздела «Играть».`)
    )
      return
    playClick()
    deletingId.value = s.id
    deleteError.value = ''
    try {
      await store.deleteScenario(String(s.id))
    } catch (err) {
      deleteError.value = err.message || 'Ошибка при удалении'
    } finally {
      deletingId.value = null
    }
  }

  onMounted(() => {
    store.fetchScenarios()
    window.addEventListener('keydown', onKeyDown, { capture: true })
  })

  onUnmounted(() => window.removeEventListener('keydown', onKeyDown, { capture: true }))

  function onKeyDown(e) {
    if (e.key !== 'Escape') return
    if (selectedScenario.value) {
      e.stopImmediatePropagation()
      onLevelBack()
    }
  }

  watch(
    () => props.autoLoadScenario,
    async (scenario) => {
      if (scenario) await editLevel(scenario)
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .level-section {
    position: relative;
    width: 100%;
    height: 100%;
    color: var(--color-text);
  }

  /* ─── Игровой интерфейс: перекрывает весь экран ───────────────────────────── */
  .level-game {
    position: fixed;
    inset: 0;
    z-index: 50;
    overflow: hidden;
  }

  /* Повторяет стиль .game-view__map из GameView.vue */
  .level-game__map {
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

  /* ─── Правая панель меню ─────────────────────────────────────────────────── */
  .level-save {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    height: 100%;
    padding: var(--space-3);
  }

  .level-save__btn {
    @include btn-outline;

    padding: var(--space-2) var(--space-4);
    font-size: 13px;

    &:disabled {
      cursor: wait;
    }
  }

  .level-save__error {
    @include text-error;

    text-align: center;
  }

  /* ─── Кнопка «К выбору» ──────────────────────────────────────────────────── */
  .level-back {
    @include btn-ghost;

    position: fixed;
    top: var(--space-4);
    left: var(--space-4);
    z-index: 60; /* выше .level-game (50) — иначе кнопка перекрывается слоем карты */
    padding: var(--space-2) var(--space-3);
    font-size: 13px;
  }

  /* ─── Тост: успешное сохранение ──────────────────────────────────────────── */
  .level-toast {
    position: fixed;
    bottom: calc(var(--menu-height) + var(--space-4));
    left: 50%;
    z-index: var(--z-popup);
    transform: translateX(-50%);
    padding: var(--space-2) var(--space-5);
    border-radius: var(--radius-sm);
    background: #166534;
    border: 1px solid #15803d;
    color: #bbf7d0;
    font-size: 13px;
    font-family: var(--font-ui);
    pointer-events: none;
    animation: toast-in 0.2s ease-out;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(8px);
    }

    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>

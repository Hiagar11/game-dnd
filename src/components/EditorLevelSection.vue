<template>
  <div class="level-section">
    <!-- ── Состояние 1: выбор карты ──────────────────────────────────────────── -->
    <template v-if="!selectedScenario">
      <div class="level-picker">
        <h2 class="level-picker__title">Выберите карту для расстановки</h2>

        <p v-if="store.loading" class="level-picker__hint">Загрузка…</p>
        <p v-else-if="!maps.length" class="level-picker__hint">
          Нет карт. Сначала загрузите их в разделе «Загрузить карты».
        </p>

        <div v-else class="level-picker__grid">
          <button
            v-for="s in maps"
            :key="s.id"
            class="level-card"
            :disabled="loadingId === s.id"
            @click="selectScenario(s)"
          >
            <img v-if="s.mapImageUrl" :src="s.mapImageUrl" class="level-card__img" alt="" />
            <div v-else class="level-card__no-img">Нет карты</div>
            <p class="level-card__name">{{ s.name || 'Без названия' }}</p>
            <span v-if="loadingId === s.id" class="level-card__loading">Загрузка…</span>
          </button>
        </div>

        <p v-if="loadError" class="level-section__error">{{ loadError }}</p>

        <!-- ── Сохранённые уровни ─────────────────────────────────────────── -->
        <!-- Тот же список, что видит игрок в GameView. Удаление здесь скрывает -->
        <!-- уровень из «Играть», т.к. оба читают из одного сенарийного стора.  -->
        <h2 class="level-picker__title level-picker__title--levels">Сохранённые уровни</h2>

        <p v-if="!levels.length && !store.loading" class="level-picker__hint">
          Нет сохранённых уровней.
        </p>

        <div v-else class="level-picker__grid">
          <!-- Клик по карточке открывает уровень в режиме редактирования (кнопка «Обновить») -->
          <!-- Кнопка × удаляет уровень окончательно из обоих разделов -->
          <div v-for="s in levels" :key="s.id" class="level-card-wrap">
            <button class="level-card" :disabled="loadingId === s.id" @click="editLevel(s)">
              <img v-if="s.mapImageUrl" :src="s.mapImageUrl" class="level-card__img" alt="" />
              <div v-else class="level-card__no-img">Нет карты</div>
              <p class="level-card__name">{{ s.name || 'Без названия' }}</p>
              <span v-if="loadingId === s.id" class="level-card__loading">Загрузка…</span>
            </button>
            <button
              class="level-card__del"
              title="Удалить уровень"
              :disabled="deletingId === s.id"
              @click="onDeleteLevel(s)"
            >
              {{ deletingId === s.id ? '…' : '×' }}
            </button>
          </div>
        </div>

        <p v-if="deleteError" class="level-section__error">{{ deleteError }}</p>
      </div>
    </template>

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
          <GameGrid :width="mapSize.width" :height="mapSize.height" />
          <GameTokens :width="mapSize.width" :height="mapSize.height" />
        </div>

        <GameMenu>
          <template #right-panel>
            <div class="level-save">
              <button class="level-save__btn" :disabled="saving" @click="onSaveBtnClick">
                {{ isEditingLevel ? 'Обновить' : 'Сохранить уровень' }}
              </button>
            </div>
          </template>
        </GameMenu>

        <!-- Кнопка возврата к выбору карты / назад в сценарий -->
        <button class="level-back" @click="props.autoLoadScenario ? goBack() : exitGame()">
          {{ props.autoLoadScenario ? '← К сценарию' : '← К выбору' }}
        </button>

        <!-- Попап: имя сохранения ─────────────────────────────────────────── -->
        <div v-if="showSavePopup" class="level-popup-overlay" @click.self="closeSavePopup">
          <div class="level-popup">
            <h3 class="level-popup__title">Сохранить уровень</h3>
            <p class="level-popup__hint">Название сохранения</p>
            <input
              ref="levelNameInputRef"
              v-model.trim="levelName"
              class="level-popup__input"
              type="text"
              maxlength="80"
              placeholder="Например: Встреча в таверне"
              @keydown.enter="onSaveLevel"
              @keydown.esc="closeSavePopup"
            />
            <p v-if="saveError" class="level-popup__error">{{ saveError }}</p>
            <div class="level-popup__actions">
              <button class="level-popup__cancel" @click="closeSavePopup">Отмена</button>
              <button
                class="level-popup__confirm"
                :disabled="saving || !levelName"
                @click="onSaveLevel"
              >
                {{ saving ? 'Сохраняю…' : 'Сохранить' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Тост: успешное сохранение ─────────────────────────────────────── -->
      </div>
    </template>
  </div>

  <!-- Тост: вне шаблонных веток — виден и на экране выбора, и в игровом интерфейсе -->
  <div v-if="saveSuccess" class="level-toast">{{ saveToastMsg }}</div>
</template>

<script setup>
  import { ref, computed, watch, onMounted } from 'vue'
  import { useMapPan } from '../composables/useMapPan'
  import { useTokenDrop } from '../composables/useTokenDrop'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'
  import { useLevelSave } from '../composables/useLevelSave'
  import { useGameStore } from '../stores/game'
  import { useTokensStore } from '../stores/tokens'
  import { useScenariosStore } from '../stores/scenarios'
  import GameMap from './GameMap.vue'
  import GameGrid from './GameGrid.vue'
  import GameTokens from './GameTokens.vue'
  import GameMenu from './GameMenu.vue'

  const props = defineProps({ autoLoadScenario: { type: Object, default: null } })
  const emit = defineEmits(['back-to-scenario'])

  const store = useScenariosStore()
  const gameStore = useGameStore()
  const tokensStore = useTokensStore()

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

  onMounted(() => store.fetchScenarios())
  watch(
    () => props.autoLoadScenario,
    async (scenario) => {
      if (scenario) await editLevel(scenario)
    },
    { immediate: true }
  )
</script>

<style scoped>
  .level-section {
    position: relative;
    width: 100%;
    height: 100%;
    color: var(--color-text);
  }

  /* ─── Выбор карты ─────────────────────────────────────────────────────────── */
  .level-picker {
    padding: var(--space-6) var(--space-8);
    overflow-y: auto;
    height: 100%;
  }

  .level-picker__title {
    font-size: 18px;
    font-weight: 600;
    margin-block-end: var(--space-5);

    /* Заголовок раздела «Сохранённые уровни» с отступом сверху */
    &--levels {
      margin-block-start: var(--space-8);
    }
  }

  .level-picker__hint {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .level-picker__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-4);
    margin-block-start: var(--space-4);
  }

  /* Обёртка: position:relative для абсолютной кнопки × */
  .level-card-wrap {
    position: relative;

    /* Кнопка × появляется при наведении */
    &:hover .level-card__del {
      opacity: 1;
    }
  }

  .level-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 30%);
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

  /* Кнопка удаления уровня */
  .level-card__del {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    border: none;
    background: rgb(0 0 0 / 70%);
    backdrop-filter: blur(4px);
    color: var(--color-text-muted);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition:
      opacity var(--transition-fast),
      color var(--transition-fast);

    &:hover:not(:disabled) {
      color: #e05555;
    }

    &:disabled {
      cursor: wait;
    }
  }

  .level-card__img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }

  .level-card__no-img {
    width: 100%;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(255 255 255 / 4%);
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .level-card__name {
    color: white;
    padding: var(--space-2) var(--space-3);
    font-size: 13px;
    text-align: left;
  }

  .level-card__loading {
    display: block;
    padding: var(--space-1) var(--space-3) var(--space-2);
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .level-section__error {
    margin-block-start: var(--space-4);
    font-size: 13px;
    color: #f87171;
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
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-primary);
    background: rgb(0 0 0 / 40%);
    color: var(--color-primary);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast);

    &:hover:not(:disabled) {
      background: var(--color-primary);
      color: #000;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.6;
    }
  }

  .level-save__error {
    font-size: 11px;
    color: #f87171;
    text-align: center;
  }

  /* ─── Кнопка «К выбору» ──────────────────────────────────────────────────── */
  .level-back {
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

  /* ─── Попап сохранения ────────────────────────────────────────────────────── */
  .level-popup-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-popup);
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 60%);
    backdrop-filter: blur(4px);
  }

  .level-popup {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 360px;
    padding: var(--space-6);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(18 18 22 / 95%);
  }

  .level-popup__title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }

  .level-popup__hint {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    margin: 0;
  }

  .level-popup__input {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 40%);
    color: var(--color-text);
    font-size: 14px;
    font-family: var(--font-ui);
    transition: border-color var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .level-popup__error {
    font-size: 12px;
    color: #f87171;
    margin: 0;
  }

  .level-popup__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-block-start: var(--space-1);
  }

  .level-popup__cancel {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: transparent;
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

  .level-popup__confirm {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-primary);
    background: var(--color-primary);
    color: #000;
    font-size: 13px;
    font-family: var(--font-ui);
    font-weight: 600;
    cursor: pointer;
    transition: opacity var(--transition-fast);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
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

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
      @select-map="selectMap"
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
        @dragleave="onDragLeave"
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
          <GameRangeOverlay :width="mapSize.width" :height="mapSize.height" />
          <GameTokens :width="mapSize.width" :height="mapSize.height" />
          <GameWallPainter :width="mapSize.width" :height="mapSize.height" />
        </div>

        <GameMenu editor-mode :scenario-mode="props.scenarioMode">
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
          :location-description="locationDescription"
          :saving="saving"
          :error="saveError"
          @update:model-value="levelName = $event"
          @update:location-description="locationDescription = $event"
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
  import { ref, computed, provide } from 'vue'
  import { useMapPan } from '../composables/useMapPan'
  import { useTokenDrop } from '../composables/useTokenDrop'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'
  import { useLevelSave } from '../composables/useLevelSave'
  import { useLevelScenarioFlow } from '../composables/useLevelScenarioFlow'
  import { useLevelMapBindings } from '../composables/useLevelMapBindings'
  import { useLevelLifecycle } from '../composables/useLevelLifecycle'
  import { useSound } from '../composables/useSound'
  import { useGameStore } from '../stores/game'
  import { useTokensStore } from '../stores/tokens'
  import { useScenariosStore } from '../stores/scenarios'
  import { useMapsStore } from '../stores/maps'
  import GameMap from './GameMap.vue'
  import GameGrid from './GameGrid.vue'
  import GameRangeOverlay from './GameRangeOverlay.vue'
  import GameTokens from './GameTokens.vue'
  import GameWallPainter from './GameWallPainter.vue'
  import GameMenu from './GameMenu.vue'
  import LevelSavePopup from './LevelSavePopup.vue'
  import LevelPickerList from './LevelPickerList.vue'

  const props = defineProps({
    autoLoadScenario: { type: Object, default: null },
    // scenarioMode: true — открыто из редактора сценариев (редактирование дверей, только системные токены)
    scenarioMode: { type: Boolean, default: false },
  })
  const emit = defineEmits(['back-to-scenario'])

  const store = useScenariosStore()
  const mapsStore = useMapsStore()
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

  const maps = computed(() => mapsStore.maps)
  const levels = computed(() => store.scenarios.filter((s) => s.tokensCount > 0))

  const {
    selectedScenario,
    mapSize,
    loadingId,
    loadError,
    isEditingLevel,
    deletingId,
    deleteError,
    selectMap,
    editLevel,
    onDeleteLevel,
  } = useLevelScenarioFlow({
    scenariosStore: store,
    gameStore,
    tokensStore,
    playClick,
  })

  // ─── Карта: пан + дропзона ───────────────────────────────────────────────────
  const viewRef = ref(null)
  const mapRef = ref(null)
  const canvasRef = ref(null)

  const { offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = useMapPan(
    viewRef,
    canvasRef
  )
  const { onDragOver, onDragLeave, onDrop } = useTokenDrop(offsetX, offsetY)
  const { close: closeContextMenu } = useTokenContextMenu()

  // GameRangeOverlay и useTokenDrop инжектируют offsetX/offsetY через provide/inject
  provide('offsetX', offsetX)
  provide('offsetY', offsetY)

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
    locationDescription,
    saving,
    saveError,
    saveSuccess,
    saveToastMsg,
    closeSavePopup,
    onSaveBtnClick,
    onSaveLevel,
  } = useLevelSave(selectedScenario, isEditingLevel, autoLoadRef, exitGame, goBack)

  const { onMapReady, onMapClick } = useLevelMapBindings({
    canvasRef,
    mapSize,
    mapRef,
    gameStore,
    closeContextMenu,
  })

  useLevelLifecycle({
    scenariosStore: store,
    mapsStore,
    selectedScenario,
    onLevelBack,
    autoLoadScenario: autoLoadRef,
    editLevel,
  })
</script>

<style scoped lang="scss" src="../assets/styles/components/editorLevelSection.scss"></style>

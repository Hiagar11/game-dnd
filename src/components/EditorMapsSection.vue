<template>
  <div class="maps-section">
    <!-- Режим без карты: левый сайдбар + правая форма -->
    <div v-if="!form.mapImageUrl" class="maps-layout">
      <EditorSidebar
        :scenarios="store.scenarios.filter((s) => !s.tokensCount)"
        :loading="store.loading"
        :active-id="form.id"
        :show-back="false"
        title="Карты"
        @select="loadScenario"
        @create="newScenario"
        @delete="handleDeleteScenario"
      />

      <main class="maps-main">
        <div class="maps-form">
          <label class="maps-form__label">
            Название
            <input
              v-model.trim="form.name"
              type="text"
              class="maps-form__input"
              placeholder="Например: Подземелье гоблинов"
              maxlength="80"
            />
          </label>

          <div class="maps-map">
            <span class="maps-form__label">Карта</span>
            <EditorMapDropzone
              :uploading="uploadingMap"
              @open-picker="triggerMapPicker"
              @file="uploadMapFile"
            />
          </div>

          <p v-if="saveError" class="maps-form__error">{{ saveError }}</p>
        </div>
      </main>
    </div>

    <!-- Режим с картой: canvas перекрывает весь экран. Ctrl+колёсико — зум. ПКМ+drag — пан. -->
    <div v-else class="maps-fullscreen">
      <div
        ref="canvasWrapRef"
        class="maps-canvas-wrap"
        :class="{ 'maps-canvas-wrap--panning': isPanning }"
        @wheel.prevent="onWheel"
        @mousedown.right.prevent="onPanStart"
        @mousemove="onPanMove"
        @mouseup.right="onPanEnd"
        @mouseleave="onPanEnd"
        @contextmenu.prevent
      >
        <canvas ref="previewCanvasRef" class="maps-canvas" :style="canvasTransformStyle" />
      </div>

      <EditorToolbar
        v-model:name="form.name"
        v-model:cell-size="form.cellSize"
        :uploading="uploadingMap"
        :saving="saving"
        :can-save="canSave"
        :scenario-id="form.id"
        :error="saveError"
        @back="exitCanvas"
        @redraw="drawPreview"
        @change-map="triggerMapPicker"
        @save="onSave"
        @delete="handleDelete"
      />
    </div>

    <!-- Скрытый input[type=file] — живёт вне условных блоков -->
    <input
      ref="mapInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="maps-file-input"
      @change="onMapFileChange"
    />
  </div>
</template>

<script setup>
  import { ref, onMounted, watch, nextTick } from 'vue'
  import { useScenariosStore } from '../stores/scenarios'
  import { useEditorCanvas } from '../composables/useEditorCanvas'
  import { useMapScenarioForm } from '../composables/useMapScenarioForm'
  import EditorSidebar from './EditorSidebar.vue'
  import EditorMapDropzone from './EditorMapDropzone.vue'
  import EditorToolbar from './EditorToolbar.vue'

  const store = useScenariosStore()

  const {
    previewCanvasRef,
    canvasWrapRef,
    canvasTransformStyle,
    isPanning,
    loadImageAndDraw,
    drawPreview,
    clearImage,
    onWheel,
    onPanStart,
    onPanMove,
    onPanEnd,
  } = useEditorCanvas()

  const {
    form,
    saving,
    uploadingMap,
    saveError,
    canSave,
    resetForm,
    fillFormFromScenario,
    uploadMapFile,
    onSave,
    onDelete,
    onDeleteScenario,
  } = useMapScenarioForm()

  const mapInputRef = ref(null)

  // Обёртки комбинируют сброс canvas и изменение формы
  function newScenario() {
    clearImage()
    resetForm()
  }
  function loadScenario(s) {
    clearImage()
    fillFormFromScenario(s)
  }
  function handleDelete() {
    onDelete(newScenario)
  }
  function handleDeleteScenario(s) {
    onDeleteScenario(s, newScenario)
  }

  function triggerMapPicker() {
    mapInputRef.value?.click()
  }

  function onMapFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    uploadMapFile(file)
  }

  function exitCanvas() {
    clearImage()
    form.value.mapImageUrl = null
  }

  onMounted(() => store.fetchScenarios())

  watch(
    () => form.value.mapImageUrl,
    async (url) => {
      if (!url) {
        clearImage()
        return
      }
      await nextTick()
      loadImageAndDraw(url, form.value.cellSize)
    }
  )
</script>

<style scoped>
  .maps-section {
    position: relative;
    width: 100%;
    height: 100%;
  }

  /* Скрытый input — вызывается программно через triggerMapPicker */
  .maps-file-input {
    display: none;
  }

  /* ─── Режим без карты: сайдбар + форма ───────────────────────────────────── */
  .maps-layout {
    display: flex;
    height: 100%;
  }

  .maps-main {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6) var(--space-8);
  }

  .maps-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    max-width: 800px;
  }

  .maps-form__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }

  .maps-form__input {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 30%);
    color: var(--color-text);
    font-size: 14px;
    font-family: var(--font-ui);
    transition: border-color var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .maps-form__error {
    font-size: 13px;
    color: #f87171;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: rgb(220 38 38 / 10%);
    border: 1px solid rgb(220 38 38 / 30%);
  }

  .maps-map {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* ─── Режим с картой: fullscreen canvas ───────────────────────────────────── */

  /* Перекрывает весь экран поверх навигации редактора (z-index 50 > z-index 1 у editor-body) */
  .maps-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 50;
  }

  /* Обрезает canvas за краями и ловит события колеса/мыши */
  .maps-canvas-wrap {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #000;
    cursor: grab;

    &--panning {
      cursor: grabbing;
    }
  }

  /* Canvas рисуется в натуральном разрешении; CSS-трансформ управляется из useEditorCanvas */
  .maps-canvas {
    display: block;
    transform-origin: 0 0;
  }
</style>

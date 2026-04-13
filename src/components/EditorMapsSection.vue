<template>
  <div class="maps-section">
    <div v-if="!form.imageUrl" class="maps-layout">
      <EditorSidebar
        :scenarios="store.maps"
        :loading="store.loading"
        :active-id="form.id"
        :show-back="false"
        title="Карты"
        @select="loadMap"
        @create="newMap"
        @delete="handleDeleteMap"
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

    <div v-else class="maps-fullscreen">
      <div
        ref="canvasWrapRef"
        class="maps-canvas-wrap"
        :class="{
          'maps-canvas-wrap--panning': isPanning,
          'maps-canvas-wrap--dragging': isDraggingGrid,
        }"
        @wheel.prevent="onWheel"
        @mousedown.left.prevent="onGridDragStart"
        @mousedown.right.prevent="onPanStart"
        @mousemove="onCanvasMouseMove"
        @mouseup.left="onCanvasMouseUpLeft"
        @mouseup.right="onPanEnd"
        @mouseleave="onCanvasMouseLeave"
        @contextmenu.prevent
      >
        <canvas ref="previewCanvasRef" class="maps-canvas" :style="canvasTransformStyle" />
      </div>

      <EditorToolbar
        v-model:name="form.name"
        v-model:cell-size="form.cellSize"
        name-placeholder="Название карты"
        :uploading="uploadingMap"
        :saving="saving"
        :can-save="canSave"
        :scenario-id="form.id"
        :error="saveError"
        @back="exitCanvas"
        @redraw="drawPreview"
        @change-map="triggerMapPicker"
        @save="handleSave"
        @delete="handleDelete"
      />
    </div>

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
  import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
  import { useMapsStore } from '../stores/maps'
  import { useEditorCanvas } from '../composables/useEditorCanvas'
  import { useMapScenarioForm } from '../composables/useMapScenarioForm'
  import EditorSidebar from './EditorSidebar.vue'
  import EditorMapDropzone from './EditorMapDropzone.vue'
  import EditorToolbar from './EditorToolbar.vue'

  const store = useMapsStore()

  const {
    previewCanvasRef,
    canvasWrapRef,
    canvasTransformStyle,
    isPanning,
    isDraggingGrid,
    setGridOffset,
    loadImageAndDraw,
    drawPreview,
    clearImage,
    onWheel,
    onPanStart,
    onPanMove,
    onPanEnd,
    onGridDragStart,
    onGridDragEnd,
    onGridOffsetChange,
  } = useEditorCanvas()

  // Когда drag сетки завершён — синхронизируем offset обратно в форму
  onGridOffsetChange((x, y) => {
    form.value.gridOffsetX = x
    form.value.gridOffsetY = y
  })

  const {
    form,
    saving,
    uploadingMap,
    saveError,
    canSave,
    resetForm,
    fillFormFromMap,
    uploadMapFile,
    onSave,
    onDelete,
    onDeleteMap,
  } = useMapScenarioForm()

  const mapInputRef = ref(null)

  function newMap() {
    clearImage()
    resetForm()
  }
  function loadMap(m) {
    clearImage()
    setGridOffset(m.gridOffsetX ?? 0, m.gridOffsetY ?? 0)
    fillFormFromMap(m)
  }
  function handleDelete() {
    onDelete(newMap)
  }
  function handleDeleteMap(m) {
    onDeleteMap(m, newMap)
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
    newMap()
  }

  function handleSave() {
    onSave(newMap)
  }

  // ─── Единые обработчики мыши для canvas-обёртки ────────────────────────────
  // onPanMove обрабатывает и ПКМ-пан и ЛКМ-drag сетки внутри себя.
  function onCanvasMouseMove(e) {
    onPanMove(e)
    // Перерисовываем сетку в реальном времени при drag
    if (isDraggingGrid.value) drawPreview(form.value.cellSize)
  }
  function onCanvasMouseUpLeft() {
    onGridDragEnd()
  }
  function onCanvasMouseLeave() {
    onPanEnd()
    onGridDragEnd()
  }

  onMounted(() => {
    store.fetchMaps()
    window.addEventListener('keydown', onKeyDown, { capture: true })
  })

  onUnmounted(() => window.removeEventListener('keydown', onKeyDown, { capture: true }))

  function onKeyDown(e) {
    if (e.key !== 'Escape') return
    if (form.value.imageUrl) {
      e.stopImmediatePropagation()
      exitCanvas()
    }
  }

  watch(
    () => form.value.imageUrl,
    async (url) => {
      if (!url) {
        clearImage()
        return
      }
      await nextTick()
      setGridOffset(form.value.gridOffsetX, form.value.gridOffsetY)
      loadImageAndDraw(url, form.value.cellSize)
    }
  )
</script>

<style scoped lang="scss" src="../assets/styles/components/editorMapsSection.scss"></style>

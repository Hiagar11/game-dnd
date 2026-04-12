<template>
  <div class="maps-section">
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
    newScenario()
  }

  function handleSave() {
    onSave(newScenario)
  }

  onMounted(() => {
    store.fetchScenarios()
    window.addEventListener('keydown', onKeyDown, { capture: true })
  })

  onUnmounted(() => window.removeEventListener('keydown', onKeyDown, { capture: true }))

  function onKeyDown(e) {
    if (e.key !== 'Escape') return
    if (form.value.mapImageUrl) {
      e.stopImmediatePropagation()
      exitCanvas()
    }
  }

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

<style scoped lang="scss" src="../assets/styles/components/editorMapsSection.scss"></style>

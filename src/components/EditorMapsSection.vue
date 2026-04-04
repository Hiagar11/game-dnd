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
        @delete="onDeleteScenario"
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
        @delete="onDelete"
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
  import { ref, computed, onMounted, watch, nextTick } from 'vue'
  import { useScenariosStore } from '../stores/scenarios'
  import { useEditorCanvas } from '../composables/useEditorCanvas'
  import EditorSidebar from './EditorSidebar.vue'
  import EditorMapDropzone from './EditorMapDropzone.vue'
  import EditorToolbar from './EditorToolbar.vue'

  const store = useScenariosStore()

  // ─── Состояние формы ────────────────────────────────────────────────────────
  const DEFAULT_CELL_SIZE = 60

  const form = ref({
    id: null,
    name: '',
    mapImageUrl: null,
    mapImagePath: null,
    cellSize: DEFAULT_CELL_SIZE,
  })

  // ─── Canvas: зум, пан, рисование ────────────────────────────────────────────
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

  // ─── Рефы на DOM ────────────────────────────────────────────────────────────
  const mapInputRef = ref(null)

  // ─── UI-флаги ────────────────────────────────────────────────────────────────
  const saving = ref(false)
  const uploadingMap = ref(false)
  const saveError = ref('')

  // ─── Геттеры ─────────────────────────────────────────────────────────────────
  const canSave = computed(
    () =>
      form.value.name.length > 0 &&
      form.value.mapImagePath !== null &&
      !uploadingMap.value &&
      !saving.value
  )

  // ─── Жизненный цикл ─────────────────────────────────────────────────────────
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

  // ─── Возврат из canvas-режима в форму ────────────────────────────────────────
  function exitCanvas() {
    clearImage()
    form.value.mapImageUrl = null
  }

  // ─── Список карт ─────────────────────────────────────────────────────────────
  function newScenario() {
    clearImage()
    saveError.value = ''
    form.value = {
      id: null,
      name: '',
      mapImageUrl: null,
      mapImagePath: null,
      cellSize: DEFAULT_CELL_SIZE,
    }
  }

  function loadScenario(s) {
    clearImage()
    saveError.value = ''
    form.value = {
      id: String(s.id),
      name: s.name,
      mapImageUrl: s.mapImageUrl ?? null,
      mapImagePath: s.mapImagePath ?? null,
      cellSize: s.cellSize ?? DEFAULT_CELL_SIZE,
    }
  }

  // ─── Загрузка карты ───────────────────────────────────────────────────────────
  function triggerMapPicker() {
    mapInputRef.value?.click()
  }

  function onMapFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    uploadMapFile(file)
  }

  async function uploadMapFile(file) {
    uploadingMap.value = true
    saveError.value = ''
    try {
      const result = await store.uploadMapImage(file)
      form.value.mapImageUrl = result.mapImageUrl
      form.value.mapImagePath = result.mapImagePath
    } catch (err) {
      saveError.value = err.message || 'Ошибка загрузки карты'
    } finally {
      uploadingMap.value = false
    }
  }

  // ─── Сохранение / удаление ───────────────────────────────────────────────────
  async function onSave() {
    if (!canSave.value) return
    saving.value = true
    saveError.value = ''

    const payload = {
      name: form.value.name,
      mapImagePath: form.value.mapImagePath,
      cellSize: form.value.cellSize,
    }

    try {
      if (form.value.id) {
        const updated = await store.updateScenario(form.value.id, payload)
        form.value.id = String(updated.id)
      } else {
        // Клиентская проверка уникальности имени перед запросом
        const duplicate = store.scenarios.find(
          (s) => s.name.trim().toLowerCase() === form.value.name.toLowerCase()
        )
        if (duplicate) {
          saveError.value = 'Карта с таким именем уже существует'
          saving.value = false
          return
        }
        const created = await store.createScenario(payload)
        form.value.id = String(created.id)
      }
    } catch (err) {
      saveError.value = err.message || 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  async function onDelete() {
    if (!confirm(`Удалить «${form.value.name}»?`)) return
    saving.value = true
    try {
      await store.deleteScenario(form.value.id)
      newScenario()
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    } finally {
      saving.value = false
    }
  }

  // Удаление из боковой панели — принимает объект сценария (s)
  async function onDeleteScenario(s) {
    if (!confirm(`Удалить «${s.name || 'Без названия'}»?`)) return
    saving.value = true
    saveError.value = ''
    try {
      await store.deleteScenario(String(s.id))
      // Если удаляем то, что сейчас открыто — сбрасываем форму
      if (String(s.id) === form.value.id) {
        newScenario()
      }
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    } finally {
      saving.value = false
    }
  }
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

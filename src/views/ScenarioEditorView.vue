<template>
  <div class="editor-view">
    <AppBackground src="/video/mainBackground.mp4" :brightness="0.4" />

    <!-- Режим без карты: левый сайдбар + правая форма -->
    <div v-if="!form.mapImageUrl" class="editor-layout">
      <EditorSidebar
        :scenarios="store.scenarios"
        :loading="store.loading"
        :active-id="form.id"
        @select="loadScenario"
        @create="newScenario"
      />

      <main class="editor-main">
        <div class="editor-form">
          <label class="editor-form__label">
            Название
            <input
              v-model.trim="form.name"
              type="text"
              class="editor-form__input"
              placeholder="Например: Подземелье гоблинов"
              maxlength="80"
            />
          </label>

          <div class="editor-map">
            <span class="editor-form__label">Карта</span>
            <EditorMapDropzone
              :uploading="uploadingMap"
              @open-picker="triggerMapPicker"
              @file="uploadMapFile"
            />
          </div>

          <p v-if="saveError" class="editor-form__error">{{ saveError }}</p>
        </div>
      </main>
    </div>

    <!-- Режим с картой: canvas на весь экран -->
    <div v-else class="editor-fullscreen">
      <!-- Ctrl + колёсико — зум. ПКМ + drag — пан. -->
      <div
        ref="canvasWrapRef"
        class="editor-canvas-wrap"
        :class="{ 'editor-canvas-wrap--panning': isPanning }"
        @wheel.prevent="onWheel"
        @mousedown.right.prevent="onPanStart"
        @mousemove="onPanMove"
        @mouseup.right="onPanEnd"
        @mouseleave="onPanEnd"
        @contextmenu.prevent
      >
        <canvas
          ref="previewCanvasRef"
          class="editor-fullscreen__canvas"
          :style="canvasTransformStyle"
        />
      </div>

      <EditorToolbar
        v-model:name="form.name"
        v-model:cell-size="form.cellSize"
        :uploading="uploadingMap"
        :saving="saving"
        :can-save="canSave"
        :scenario-id="form.id"
        :error="saveError"
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
      class="editor-form__file-input"
      @change="onMapFileChange"
    />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch, nextTick } from 'vue'
  import { useScenariosStore } from '../stores/scenarios'
  import { useEditorCanvas } from '../composables/useEditorCanvas'
  import AppBackground from '../components/AppBackground.vue'
  import EditorSidebar from '../components/EditorSidebar.vue'
  import EditorMapDropzone from '../components/EditorMapDropzone.vue'
  import EditorToolbar from '../components/EditorToolbar.vue'

  const store = useScenariosStore()

  // ─── Состояние формы ────────────────────────────────────────────────────────
  const DEFAULT_CELL_SIZE = 60

  const form = ref({
    id: null,
    name: '',
    mapImageUrl: null, // полный URL для canvas (blob или с сервера)
    mapImagePath: null, // относительный путь — отправляем на сервер
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

  // Когда меняется mapImageUrl — перезагружаем изображение.
  // nextTick нужен: Vue сначала рендерит <canvas>, потом мы на него рисуем.
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

  // ─── Список сценариев ─────────────────────────────────────────────────────────
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
    if (!confirm(`Удалить сценарий «${form.value.name}»?`)) return
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
</script>

<style scoped>
  .editor-view {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    color: var(--color-text);
    font-family: var(--font-ui);
  }

  /* Скрытый input[type=file] — вызывается программно */
  .editor-form__file-input {
    display: none;
  }

  /* ─── Режим без карты: сайдбар + форма ───────────────────────────────────── */
  .editor-layout {
    position: relative;
    z-index: 1;
    display: flex;
    height: 100%;
  }

  .editor-main {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6) var(--space-8);
  }

  .editor-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    max-width: 800px;
  }

  .editor-form__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }

  .editor-form__input {
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

  .editor-form__error {
    font-size: 13px;
    color: #f87171;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: rgb(220 38 38 / 10%);
    border: 1px solid rgb(220 38 38 / 30%);
  }

  /* Обёртка секции «Карта» в форме */
  .editor-map {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* ─── Режим с картой: fullscreen canvas ───────────────────────────────────── */
  .editor-fullscreen {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
  }

  /*
    Контейнер обрезает canvas за краями и ловит события колеса/мыши.
    @wheel.prevent делает слушатель non-passive — это обязательно для preventDefault.
  */
  .editor-canvas-wrap {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #000;
    cursor: grab;

    &--panning {
      cursor: grabbing;
    }
  }

  /*
    Canvas рисуется в натуральном разрешении карты.
    CSS-трансформ управляется через :style из useEditorCanvas.
    transform-origin: 0 0 — смещение при зуме считается вручную.
  */
  .editor-fullscreen__canvas {
    display: block;
    transform-origin: 0 0;
  }
</style>

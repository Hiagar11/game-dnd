<template>
  <div class="gmap-section">
    <!-- ─── Режим формы: sidebar + dropzone ─────────────────────────────────── -->
    <div v-if="!form.imageUrl" class="gmap-layout">
      <EditorSidebar
        :scenarios="store.maps"
        :loading="store.loading"
        :active-id="form.id"
        :show-back="false"
        title="Глобальные карты"
        @select="loadMap"
        @create="newMap"
        @delete="handleDeleteMap"
      />

      <main class="gmap-main">
        <div class="gmap-form">
          <label class="gmap-form__label">
            Название
            <input
              v-model.trim="form.name"
              type="text"
              class="gmap-form__input"
              placeholder="Например: Мир «Элдория»"
              maxlength="80"
            />
          </label>

          <div class="gmap-map">
            <span class="gmap-form__label">Карта</span>
            <EditorMapDropzone
              :uploading="uploadingMap"
              @open-picker="triggerMapPicker"
              @file="uploadMapFile"
            />
          </div>

          <p v-if="saveError" class="gmap-form__error">{{ saveError }}</p>
        </div>
      </main>
    </div>

    <!-- ─── Режим canvas: полноэкранный ─────────────────────────────────────── -->
    <div v-else class="gmap-fullscreen">
      <div
        ref="canvasWrapRef"
        class="gmap-canvas-wrap"
        :class="{
          'gmap-canvas-wrap--panning': isPanning,
          'gmap-canvas-wrap--dragging': isDraggingStop,
          'gmap-canvas-wrap--path-mode': editMode === 'path',
        }"
        @wheel.prevent="onWheel"
        @mousedown.left.prevent="onLeftDown"
        @mousedown.right.prevent="onRightDown"
        @mousemove="onMouseMove"
        @mouseup.left="onLeftUp"
        @mouseup.right="onRightUp"
        @mouseleave="onLeave"
        @contextmenu.prevent
      >
        <canvas ref="canvasRef" class="gmap-canvas" :style="canvasTransformStyle" />
      </div>

      <!-- Тулбар -->
      <div class="gmap-toolbar">
        <button class="gmap-toolbar__back" @click="exitCanvas">←</button>

        <input
          v-model.trim="form.name"
          type="text"
          class="gmap-toolbar__name"
          placeholder="Название карты"
          maxlength="80"
        />

        <div class="gmap-toolbar__sep" />

        <button
          class="gmap-toolbar__mode-btn"
          :class="{ 'gmap-toolbar__mode-btn--active': editMode === 'stop' }"
          @click="setMode('stop')"
        >
          📍 Остановки
        </button>
        <button
          class="gmap-toolbar__mode-btn"
          :class="{ 'gmap-toolbar__mode-btn--active': editMode === 'path' }"
          @click="setMode('path')"
        >
          🔗 Маршруты
        </button>

        <div class="gmap-toolbar__sep" />

        <button class="gmap-toolbar__btn" :disabled="uploadingMap" @click="triggerMapPicker">
          <span v-if="uploadingMap" class="gmap-toolbar__spinner" />
          <span v-else>Карта…</span>
        </button>

        <div class="gmap-toolbar__sep" />

        <p v-if="saveError" class="gmap-toolbar__error">{{ saveError }}</p>

        <button
          v-if="form.id"
          class="gmap-toolbar__btn gmap-toolbar__btn--delete"
          :disabled="saving"
          @click="handleDelete"
        >
          Удалить
        </button>

        <button
          class="gmap-toolbar__btn gmap-toolbar__btn--save"
          :disabled="!canSave || saving"
          @click="handleSave"
        >
          <span v-if="saving" class="gmap-toolbar__spinner gmap-toolbar__spinner--dark" />
          <span v-else>{{ form.id ? 'Сохранить' : 'Создать' }}</span>
        </button>
      </div>

      <!-- Список остановок (правый верхний угол) -->
      <aside v-if="form.stops.length" class="gmap-stops-list">
        <div class="gmap-stops-list__header">Остановки ({{ form.stops.length }})</div>
        <ul class="gmap-stops-list__items">
          <li
            v-for="s in form.stops"
            :key="s.uid"
            class="gmap-stops-list__item"
            :class="{ 'gmap-stops-list__item--active': s.uid === selectedStopUid }"
            @click="selectStop(s.uid)"
          >
            <span class="gmap-stops-list__item-name">{{ s.label || 'Без названия' }}</span>
            <button
              class="gmap-stops-list__item-del"
              title="Удалить остановку"
              @click.stop="removeStopFromList(s.uid)"
            >
              ✕
            </button>
          </li>
        </ul>
      </aside>

      <!-- Панель выбранной остановки -->
      <div v-if="selectedStop" class="gmap-stop-panel">
        <span style="font-size: 12px; color: var(--color-text-muted)">Остановка:</span>
        <input
          :value="selectedStop.label"
          type="text"
          class="gmap-stop-panel__label-input"
          placeholder="Название точки"
          maxlength="40"
          @input="onStopLabelInput"
        />
        <button class="gmap-stop-panel__remove" @click="deleteSelectedStop">✕ Удалить</button>
      </div>
    </div>

    <input
      ref="mapInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="gmap-file-input"
      @change="onMapFileChange"
    />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
  import { useGlobalMapsStore } from '../stores/globalMaps'
  import { useGlobalMapCanvas } from '../composables/useGlobalMapCanvas'
  import { useGlobalMapForm } from '../composables/useGlobalMapForm'
  import EditorSidebar from './EditorSidebar.vue'
  import EditorMapDropzone from './EditorMapDropzone.vue'

  const store = useGlobalMapsStore()

  const {
    canvasRef,
    canvasWrapRef,
    canvasTransformStyle,
    isPanning,
    isDraggingStop,
    clientToImage,
    hitTestStop,
    hitTestPath,
    loadImageAndDraw,
    draw,
    clearImage,
    onWheel,
    onPanStart,
    onPanMove,
    onPanEnd,
    startStopDrag,
    endStopDrag,
  } = useGlobalMapCanvas()

  const {
    form,
    saving,
    uploadingMap,
    saveError,
    canSave,
    resetForm,
    fillFormFromMap,
    uploadMapFile,
    addStop,
    moveStop,
    removeStop,
    updateStopLabel,
    addPath,
    removePath,
    onSave,
    onDelete,
    onDeleteMap,
  } = useGlobalMapForm()

  const mapInputRef = ref(null)
  const editMode = ref('stop') // 'stop' | 'path'
  const selectedStopUid = ref(null)
  const drawingFromUid = ref(null)
  const pendingWaypoints = ref([])
  const mouseImagePos = ref(null)
  const hoveredPathKey = ref(null)

  const selectedStop = computed(
    () => form.value.stops.find((s) => s.uid === selectedStopUid.value) ?? null
  )

  // ─── Управление режимами ─────────────────────────────────────────────────
  function setMode(m) {
    editMode.value = m
    if (m === 'stop') {
      drawingFromUid.value = null
      pendingWaypoints.value = []
    }
    redraw()
  }

  // ─── Redraw helper ───────────────────────────────────────────────────────
  function redraw() {
    draw(
      form.value.stops,
      form.value.paths,
      selectedStopUid.value,
      drawingFromUid.value,
      mouseImagePos.value,
      pendingWaypoints.value,
      hoveredPathKey.value
    )
  }

  // ─── ЛКМ down ───────────────────────────────────────────────────────────
  function onLeftDown(e) {
    const imgPos = clientToImage(e.clientX, e.clientY)
    if (!imgPos) return

    const hitStop = hitTestStop(imgPos.x, imgPos.y, form.value.stops)

    if (editMode.value === 'stop') {
      if (hitStop) {
        // Выделяем + начинаем drag
        selectedStopUid.value = hitStop.uid
        const uid = hitStop.uid
        startStopDrag(
          (x, y) => {
            moveStop(uid, x, y)
            redraw()
          },
          () => redraw()
        )
      } else {
        // Добавляем новую остановку
        const uid = addStop(imgPos.x, imgPos.y)
        selectedStopUid.value = uid
      }
      redraw()
    }

    if (editMode.value === 'path') {
      if (hitStop) {
        if (!drawingFromUid.value) {
          // Начинаем маршрут
          drawingFromUid.value = hitStop.uid
          selectedStopUid.value = hitStop.uid
          pendingWaypoints.value = []
        } else {
          // Завершаем маршрут
          if (hitStop.uid !== drawingFromUid.value) {
            addPath(drawingFromUid.value, hitStop.uid, pendingWaypoints.value)
          }
          drawingFromUid.value = null
          pendingWaypoints.value = []
        }
        redraw()
      } else if (drawingFromUid.value) {
        // Клик по пустому месту — добавляем waypoint (изгиб маршрута)
        pendingWaypoints.value.push({ x: imgPos.x, y: imgPos.y })
        redraw()
      }
    }
  }

  function onLeftUp() {
    endStopDrag()
  }

  // ─── Mouse move ─────────────────────────────────────────────────────────
  function onMouseMove(e) {
    onPanMove(e)

    const imgPos = clientToImage(e.clientX, e.clientY)
    if (imgPos) mouseImagePos.value = imgPos

    // Подсветка маршрута под курсором (только когда не рисуем новый)
    if (editMode.value === 'path' && !drawingFromUid.value && imgPos) {
      const hit = hitTestPath(imgPos.x, imgPos.y, form.value.paths, form.value.stops)
      const key = hit ? `${hit.from}|${hit.to}` : null
      if (key !== hoveredPathKey.value) {
        hoveredPathKey.value = key
        redraw()
      }
    } else if (hoveredPathKey.value) {
      hoveredPathKey.value = null
      redraw()
    }

    if (isDraggingStop.value || drawingFromUid.value) {
      redraw()
    }
  }

  // ─── ПКМ (right mouse) ───────────────────────────────────────────────────
  function onRightDown(e) {
    // Если рисуем маршрут — отменяем
    if (drawingFromUid.value) {
      drawingFromUid.value = null
      pendingWaypoints.value = []
      redraw()
      return
    }

    // Если наведены на маршрут — удаляем его
    if (hoveredPathKey.value && editMode.value === 'path') {
      const imgPos = clientToImage(e.clientX, e.clientY)
      if (imgPos) {
        const hit = hitTestPath(imgPos.x, imgPos.y, form.value.paths, form.value.stops)
        if (hit) {
          removePath(hit.from, hit.to)
          hoveredPathKey.value = null
          redraw()
          return
        }
      }
    }

    // Иначе — пан камеры
    onPanStart(e)
  }

  function onRightUp() {
    onPanEnd()
  }

  function onLeave() {
    onPanEnd()
    endStopDrag()
  }

  // ─── Панель остановки ───────────────────────────────────────────────────
  function onStopLabelInput(e) {
    if (!selectedStopUid.value) return
    updateStopLabel(selectedStopUid.value, e.target.value)
    redraw()
  }

  function deleteSelectedStop() {
    if (!selectedStopUid.value) return
    removeStop(selectedStopUid.value)
    selectedStopUid.value = null
    redraw()
  }

  // ─── Список остановок (правая панель) ──────────────────────────────────
  function selectStop(uid) {
    selectedStopUid.value = uid
    redraw()
  }

  function removeStopFromList(uid) {
    removeStop(uid)
    if (selectedStopUid.value === uid) selectedStopUid.value = null
    redraw()
  }

  // ─── Список / форма ────────────────────────────────────────────────────
  function newMap() {
    clearImage()
    resetForm()
    selectedStopUid.value = null
    drawingFromUid.value = null
    pendingWaypoints.value = []
  }

  function loadMap(gm) {
    clearImage()
    fillFormFromMap(gm)
    selectedStopUid.value = null
    drawingFromUid.value = null
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

  function handleDelete() {
    onDelete(newMap)
  }

  function handleDeleteMap(gm) {
    onDeleteMap(gm, newMap)
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────
  onMounted(() => {
    store.fetchMaps()
    window.addEventListener('keydown', onKeyDown, { capture: true })
  })

  onUnmounted(() => window.removeEventListener('keydown', onKeyDown, { capture: true }))

  function onKeyDown(e) {
    if (e.key === 'Escape' && form.value.imageUrl) {
      e.stopImmediatePropagation()
      exitCanvas()
    }
    // Delete / Backspace — удалить выбранную остановку
    if (
      (e.key === 'Delete' || e.key === 'Backspace') &&
      selectedStopUid.value &&
      form.value.imageUrl
    ) {
      // Не удалять если фокус в input
      if (document.activeElement?.tagName === 'INPUT') return
      e.preventDefault()
      deleteSelectedStop()
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
      loadImageAndDraw(url, form.value.stops, form.value.paths)
    }
  )
</script>

<style scoped lang="scss" src="../assets/styles/components/editorGlobalMapSection.scss"></style>

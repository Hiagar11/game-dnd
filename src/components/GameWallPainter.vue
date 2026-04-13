<template>
  <!--
    Слой рисования стен. Активен только в wallMode.
    z-index: 4 — выше токенов (--z-tokens: 3), чтобы перехватывать клики
    даже над токенами, не мешая обычному режиму.

    ЛКМ зажата → рисуем стены по ячейкам под курсором.
    ПКМ → стираем стену в ячейке.
  -->
  <div
    v-if="store.wallMode"
    class="game-wall-painter"
    :style="{ width: `${width}px`, height: `${height}px` }"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @contextmenu.prevent="onRightClick"
  />
</template>

<script setup>
  import { ref } from 'vue'
  import { useGameStore } from '../stores/game'

  defineProps({
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  })

  const store = useGameStore()

  // Режим текущего мазка:
  //   'add'    — ЛКМ зажата, рисуем стены
  //   'remove' — не используется при drag (ПКМ → только клик)
  //   null     — мышь не зажата
  const paintMode = ref(null)

  /**
   * Переводит позицию мыши (clientX/Y) в координату клетки (col, row).
   * Берём getBoundingClientRect у элемента-слоя (currentTarget) —
   * это корректно работает дажепри CSS transform (пан карты).
   */
  function getCellAt(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const hc = store.halfCell
    return {
      col: Math.floor((e.clientX - rect.left - store.gridNormOX) / hc),
      row: Math.floor((e.clientY - rect.top - store.gridNormOY) / hc),
    }
  }

  function onMouseDown(e) {
    // ЛКМ (button=0) — начинаем рисовать
    if (e.button === 0) {
      paintMode.value = 'add'
      const { col, row } = getCellAt(e)
      store.addWall(col, row)
    }
  }

  function onMouseMove(e) {
    if (paintMode.value !== 'add') return
    const { col, row } = getCellAt(e)
    store.addWall(col, row)
  }

  function onMouseUp() {
    paintMode.value = null
  }

  // ПКМ — стираем стену в ячейке под курсором (одиночный клик, без drag)
  function onRightClick(e) {
    const { col, row } = getCellAt(e)
    store.removeWall(col, row)
  }
</script>

<style scoped>
  .game-wall-painter {
    position: absolute;
    top: 0;
    left: 0;

    /*
      z-index: 4 — поверх токенов (3) и оверлея зоны (2).
      В режиме стен wall painter перехватывает все клики.
    */
    z-index: 4;

    /* Курсор-карандаш намекает что здесь можно рисовать */
    cursor: crosshair;
  }
</style>

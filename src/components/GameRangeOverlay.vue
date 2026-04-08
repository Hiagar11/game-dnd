<template>
  <!--
    Прозрачный слой поверх карты, активный только когда выбран токен.
    Отвечает за:
      1. Смену курсора на сапог при наведении на клетку в зоне хода.
      2. Клик по клетке в зоне → токен плавно перемещается туда.
      3. Клик вне зоны → снятие выделения.

    z-index: 2 — между сеткой (авто) и токенами (--z-tokens: 3).
    У токенов pointer-events: auto, поэтому клики по самим токенам
    уходят к ним, а не к этому слою.
  -->
  <div
    v-if="selectedToken"
    class="game-range-overlay"
    :class="{ 'game-range-overlay--boot': cursorInRange }"
    :style="{ width: `${width}px`, height: `${height}px` }"
    @mousemove="onMouseMove"
    @click.stop="onClick"
    @mouseleave="cursorInRange = false"
  />
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useSocket } from '../composables/useSocket'
  import { buildReachableCells } from '../composables/useTokenMove'

  defineProps({
    // Размеры карты — оверлей должен покрывать её полностью
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  })

  const store = useGameStore()
  const { getSocket } = useSocket()

  // true — курсор сейчас над клеткой в зоне хода → показываем сапог
  const cursorInRange = ref(false)

  // Токен, который сейчас выбран (null если ни один, и null для системных токенов —
  // дверей, факелов и пр., которые не перемещаются)
  const selectedToken = computed(() => {
    const t = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    return t && !t.systemToken ? t : null
  })

  // Множество достижимых клеток (обновляется при смене токена или стен).
  // BFS знает про стены — зона не пространяется за них.
  const reachableCells = computed(() =>
    selectedToken.value ? buildReachableCells(selectedToken.value, store.walls) : new Set()
  )

  /**
   * Переводит позицию мыши (clientX/Y) в координату клетки (col, row).
   * Использует currentTarget.getBoundingClientRect() — работает корректно
   * даже если карта масштабирована через CSS transform.
   */
  function getCellAt(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    return {
      col: Math.floor(x / store.cellSize),
      row: Math.floor(y / store.cellSize),
    }
  }

  function onMouseMove(e) {
    if (!selectedToken.value) return
    const { col, row } = getCellAt(e)
    cursorInRange.value = reachableCells.value.has(`${col},${row}`)
  }

  function onClick(e) {
    if (!selectedToken.value) return

    const { col, row } = getCellAt(e)

    if (reachableCells.value.has(`${col},${row}`)) {
      // Обновляем позицию локально (CSS transition анимирует движение)
      store.moveToken(selectedToken.value.uid, col, row)

      // Синхронизируем с сервером и зрителями через сокет.
      // Сервер обновит scenario.placedTokens — это важно для корректного
      // сохранения игровой сессии (снапшот берётся с сервера).
      const scenarioId = String(store.currentScenario?.id ?? '')
      if (scenarioId) {
        getSocket()?.emit('token:move', {
          scenarioId,
          uid: selectedToken.value.uid,
          col,
          row,
        })
      }
    } else {
      // Клик вне зоны — снимаем выделение
      store.selectPlacedToken(null)
    }
  }
</script>

<style scoped>
  .game-range-overlay {
    position: absolute;
    top: 0;
    left: 0;

    /*
      z-index: 2 — выше сетки, но ниже токенов (--z-tokens: 3).
      Благодаря этому клики по самим токенам дойдут до них,
      а клики по пустым клеткам — до нас.
    */
    z-index: 2;
    cursor: default;
  }

  /*
    Курсор-сапог — показывается над клетками в зоне хода.
    SVG встроен прямо в CSS через data URI (не нужен отдельный файл).
    Формат: url("data:image/svg+xml,...") <hotspot-x> <hotspot-y>, <fallback>.
    Горячая точка (27, 25) — носок сапога.
  */
  .game-range-overlay--boot {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M9 1 L15 1 L15 18 L22 18 L27 22 L27 28 L3 28 L3 22 L9 22 Z' fill='%234ade80' stroke='white' stroke-width='1.5' stroke-linejoin='round'/%3E%3C/svg%3E")
        27 25,
      pointer;
  }
</style>

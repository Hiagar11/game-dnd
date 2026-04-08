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
    @dragover="onDragOver"
    @drop="onDrop"
  />
</template>

<script setup>
  import { ref, computed, inject } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useSocket } from '../composables/useSocket'
  import { buildReachableCells, findPath } from '../composables/useTokenMove'
  import { useTokenDrop } from '../composables/useTokenDrop'

  defineProps({
    // Размеры карты — оверлей должен покрывать её полностью
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  })

  const store = useGameStore()
  const { getSocket } = useSocket()

  // Получаем смещение карты от GameView (provide/inject) — нужно для useTokenDrop
  const offsetX = inject('offsetX')
  const offsetY = inject('offsetY')
  const { onDragOver, onDrop } = useTokenDrop(offsetX, offsetY)

  // true — курсор сейчас над клеткой в зоне хода → показываем следы
  const cursorInRange = ref(false)

  // true — идёт анимация ходьбы. Блокируем повторные клики в этот период.
  const isWalking = ref(false)

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
    if (!selectedToken.value || isWalking.value) return

    const { col, row } = getCellAt(e)

    if (reachableCells.value.has(`${col},${row}`)) {
      // Ищем маршрут через BFS с учётом стен — цепочка клеток от текущей до цели.
      // BFS гарантирует, что токен огибает стены, не «срезает» углы.
      const path = findPath(selectedToken.value, { col, row }, store.walls)
      if (!path || path.length === 0) {
        store.selectPlacedToken(null)
        return
      }

      // Захватываем uid до снятия выделения — после deselect computed вернёт null
      const uid = selectedToken.value.uid
      const scenarioId = String(store.currentScenario?.id ?? '')

      // Снимаем выделение сразу: overlay исчезнет, но async-анимация продолжит работу
      isWalking.value = true
      store.selectPlacedToken(null)

      // Шаги задержаны на 380ms — чуть больше CSS transition (350ms) на токене,
      // чтобы каждый следующий шаг начинался только когда предыдущий визуально завершился.
      ;(async () => {
        for (const step of path) {
          store.moveToken(uid, step.col, step.row)
          if (scenarioId) {
            getSocket()?.emit('token:move', { scenarioId, uid, col: step.col, row: step.row })
          }
          await new Promise((resolve) => setTimeout(resolve, 380))
        }
        isWalking.value = false
      })()
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
    Курсор-следы — два следа ступни, показываются над клетками в зоне хода.
    SVG встроен в CSS через data URI (не нужен отдельный файл).
    Горячая точка (20 20) — центр курсора, где происходит клик.

    Структура SVG:
      - Правая нога (сзади, 35% opacity): верх, справа
      - Левая нога (спереди, 90% opacity): низ, слева
    Каждая нога — эллипс (пад) + 4 круга (пальцы).
  */
  .game-range-overlay--boot {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cg opacity='0.35'%3E%3Cellipse cx='28' cy='16' rx='5' ry='8' fill='%234ade80'/%3E%3Ccircle cx='24' cy='7' r='2.2' fill='%234ade80'/%3E%3Ccircle cx='28' cy='6' r='2.5' fill='%234ade80'/%3E%3Ccircle cx='32' cy='7' r='2.2' fill='%234ade80'/%3E%3Ccircle cx='35' cy='10' r='1.8' fill='%234ade80'/%3E%3C/g%3E%3Cg opacity='0.9'%3E%3Cellipse cx='12' cy='28' rx='5' ry='8' fill='%234ade80'/%3E%3Ccircle cx='8' cy='19' r='2.2' fill='%234ade80'/%3E%3Ccircle cx='12' cy='18' r='2.5' fill='%234ade80'/%3E%3Ccircle cx='16' cy='19' r='2.2' fill='%234ade80'/%3E%3Ccircle cx='19' cy='22' r='1.8' fill='%234ade80'/%3E%3C/g%3E%3C/svg%3E")
        20 20,
      pointer;
  }
</style>

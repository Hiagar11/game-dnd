<script setup>
  import { ref, watch, onMounted } from 'vue'
  import { useGameStore } from '../stores/game'

  // Принимаем размеры карты от родителя (GameView).
  // GameView узнаёт их из события @ready от GameMap.
  const props = defineProps({
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  })

  const store = useGameStore()
  const canvasRef = ref(null)

  function drawGrid() {
    const canvas = canvasRef.value

    // Пока карта не готова — рисовать нечего
    if (!canvas || !props.width || !props.height) return

    // Обновляем размер canvas под размер карты
    canvas.width = props.width
    canvas.height = props.height

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const { cellSize, colorGrid } = store

    // Настройки линий сетки
    ctx.beginPath()
    ctx.strokeStyle = colorGrid
    ctx.lineWidth = 1

    // Вертикальные линии
    for (let x = 0; x <= canvas.width; x += cellSize) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
    }

    // Горизонтальные линии
    for (let y = 0; y <= canvas.height; y += cellSize) {
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
    }

    ctx.stroke()
  }

  // Перерисовываем сетку при изменении размеров карты или размера ячейки.
  // watch следит за реактивными значениями и вызывает колбэк при их изменении.
  watch([() => props.width, () => props.height, () => store.cellSize], drawGrid)

  // onMounted — выполняется один раз, когда компонент добавлен в DOM.
  // На этом этапе canvasRef.value уже доступен.
  onMounted(drawGrid)
</script>

<template>
  <canvas ref="canvasRef" class="game-grid"></canvas>
</template>

<style lang="scss" scoped>
  .game-grid {
    display: block;
    position: absolute;
    top: 0;
    left: 0;

    // pointer-events: none — сетка не перехватывает клики мыши,
    // события проходят сквозь неё к карте (панорамирование продолжает работать)
    pointer-events: none;
  }
</style>

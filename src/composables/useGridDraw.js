// Composable — это функция, которая инкапсулирует реактивную логику.
// Соглашение об именовании: всегда начинается с "use".
//
// useGridDraw отвечает за рисование сетки на canvas.
// Компонент GameGrid не знает деталей — он просто вешает canvasRef на элемент.
import { onMounted, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'

// props — объект пропсов компонента (ширина и высота карты)
export function useGridDraw(props) {
  const store = useGameStore()

  // ref(null) — ссылка на DOM-элемент <canvas>.
  // Компонент привяжет к ней реальный элемент через `ref="canvasRef"`.
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

    // Настройки линий сетки
    ctx.beginPath()
    ctx.strokeStyle = store.colorGrid
    ctx.lineWidth = 1

    // Вертикальные линии
    for (let x = 0; x <= canvas.width; x += store.cellSize) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
    }

    // Горизонтальные линии
    for (let y = 0; y <= canvas.height; y += store.cellSize) {
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
    }

    ctx.stroke()
  }

  // Перерисовываем сетку при изменении размеров карты, размера ячейки или цвета.
  watch(
    [() => props.width, () => props.height, () => store.cellSize, () => store.colorGrid],
    drawGrid
  )

  // onMounted внутри composable работает в контексте вызывающего компонента —
  // это стандартная практика, Vue специально это поддерживает.
  onMounted(drawGrid)

  // Возвращаем только то, что нужно компоненту снаружи.
  return { canvasRef }
}

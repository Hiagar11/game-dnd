// Composable — это функция, которая инкапсулирует реактивную логику.
// Соглашение об именовании: всегда начинается с "use".
//
// useGridDraw отвечает за рисование сетки на canvas.
// Компонент GameGrid не знает деталей — он просто вешает canvasRef на элемент.
import { onMounted, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { useTokensStore } from '../stores/tokens'
import { useHeroesStore } from '../stores/heroes'
import { buildReachableCells } from './useTokenMove'

// props — объект пропсов компонента (ширина и высота карты)
export function useGridDraw(props) {
  const store = useGameStore()
  const tokensStore = useTokensStore()
  const heroesStore = useHeroesStore()

  const canvasRef = ref(null)

  function drawGrid() {
    const canvas = canvasRef.value

    if (!canvas || !props.width || !props.height) return

    canvas.width = props.width
    canvas.height = props.height

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ─── Зона радиуса выбранного токена ──────────────────────────────────────
    if (props.viewerMode) {
      // Режим зрителя: рисуем зону хода для выбранного героя.
      // Приоритет: adminSelectedUid (мастер выбрал) → selectedUid (игрок кликнул).
      // Если ни одного нет — зона не отображается.
      const selectedUid = heroesStore.adminSelectedUid ?? heroesStore.selectedUid
      if (!selectedUid) return // без выделения — пропускаем

      const heroIds = new Set(heroesStore.heroes.map((h) => h.id))
      const placed = store.placedTokens.find((t) => t.uid === selectedUid && heroIds.has(t.tokenId))
      if (!placed) return

      const reachable = buildReachableCells(placed, store.walls)
      ctx.fillStyle = 'rgba(74, 222, 128, 0.25)'
      for (const key of reachable) {
        const [c, r] = key.split(',').map(Number)
        ctx.fillRect(c * store.cellSize, r * store.cellSize, store.cellSize, store.cellSize)
      }
    } else {
      // Режим админа: зона только для выбранного токена.
      const selected = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)

      if (selected && !selected.systemToken) {
        const reachable = buildReachableCells(selected, store.walls)

        ctx.fillStyle = 'rgba(74, 222, 128, 0.25)'
        for (const key of reachable) {
          const [c, r] = key.split(',').map(Number)
          ctx.fillRect(c * store.cellSize, r * store.cellSize, store.cellSize, store.cellSize)
        }
      }
    }

    // ─── Стены (поверх зоны токена, под линиями сетки) ────────────────
    // В режиме игры — стены невидимы (блокируют движение, но не отображаются).
    // В режиме редактора — красные клетки для визуального 'painting'.
    if (props.editorMode && store.walls.length) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.55)'
      for (const w of store.walls) {
        ctx.fillRect(w.col * store.cellSize, w.row * store.cellSize, store.cellSize, store.cellSize)
      }
    }

    // ─── Линии сетки (поверх заливки) ────────────────────────────────────────
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

  // Перерисовываем сетку при изменении размеров карты, размера ячейки, цвета,
  // а также при смене выбранного токена, позиций токенов или стен.
  watch(
    [
      () => props.width,
      () => props.height,
      () => store.cellSize,
      () => store.colorGrid,
      () => store.selectedPlacedUid,
      () => store.placedTokens.map((t) => `${t.uid}:${t.col}:${t.row}`).join(','),
      () => store.walls.map((w) => `${w.col}:${w.row}`).join(','),
      // Зона героев на viewer-стороне обновляется при изменении списка героев или выбора
      () => heroesStore.heroes.map((h) => h.id).join(','),
      () => heroesStore.selectedUid,
      () => heroesStore.adminSelectedUid,
    ],
    drawGrid
  )

  // onMounted внутри composable работает в контексте вызывающего компонента —
  // это стандартная практика, Vue специально это поддерживает.
  onMounted(drawGrid)

  // Возвращаем только то, что нужно компоненту снаружи.
  return { canvasRef }
}

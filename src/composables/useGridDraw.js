// Composable — это функция, которая инкапсулирует реактивную логику.
// Соглашение об именовании: всегда начинается с "use".
//
// useGridDraw отвечает за рисование сетки на canvas.
// Компонент GameGrid не знает деталей — он просто вешает canvasRef на элемент.
import { onMounted, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { useHeroesStore } from '../stores/heroes'
import { buildReachableCells } from './useTokenMove'
import { getSelectedToken, isNonSystemToken } from '../utils/tokenFilters'

// props — объект пропсов компонента (ширина и высота карты)
export function useGridDraw(props) {
  const store = useGameStore()
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
      const selected = getSelectedToken(store.placedTokens, store.selectedPlacedUid)

      if (isNonSystemToken(selected)) {
        const ap = selected.actionPoints ?? 0
        const reachable = ap > 0 ? buildReachableCells(selected, store.walls, ap) : new Set()

        ctx.fillStyle = 'rgba(74, 222, 128, 0.25)'
        for (const key of reachable) {
          const [c, r] = key.split(',').map(Number)
          ctx.fillRect(c * store.cellSize, r * store.cellSize, store.cellSize, store.cellSize)
        }

        // ── Фантомный путь при ховере ─────────────────────────────────────────
        const hcell = store.hoveredCell
        if (hcell) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.20)'
          ctx.fillRect(
            hcell.col * store.cellSize,
            hcell.row * store.cellSize,
            store.cellSize,
            store.cellSize
          )
        }

        const path = store.hoveredPath
        if (path && path.length > 0) {
          const cs = store.cellSize
          const half = cs / 2

          // Начальная точка — сам токен
          const startX = selected.col * cs + half
          const startY = selected.row * cs + half

          // Линия пути
          ctx.beginPath()
          ctx.moveTo(startX, startY)
          for (const step of path) {
            ctx.lineTo(step.col * cs + half, step.row * cs + half)
          }
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)'
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.setLineDash([4, 4])
          ctx.stroke()
          ctx.setLineDash([])

          // Точки по промежуточным клеткам
          ctx.fillStyle = 'rgba(250, 204, 21, 0.85)'
          for (let i = 0; i < path.length - 1; i++) {
            const step = path[i]
            ctx.beginPath()
            ctx.arc(step.col * cs + half, step.row * cs + half, 3, 0, Math.PI * 2)
            ctx.fill()
          }

          // Конечная точка — крупнее
          const last = path[path.length - 1]
          ctx.fillStyle = 'rgba(250, 204, 21, 1)'
          ctx.beginPath()
          ctx.arc(last.col * cs + half, last.row * cs + half, 5, 0, Math.PI * 2)
          ctx.fill()
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
      () => store.placedTokens.map((t) => `${t.uid}:${t.col}:${t.row}:${t.attitude}`).join(','),
      () => store.hoveredPath.map((s) => `${s.col},${s.row}`).join(','),
      () => `${store.hoveredCell?.col},${store.hoveredCell?.row}`,
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

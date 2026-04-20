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

    // ─── Смещение сетки (нормализовано в [0, cellSize)) ────────────────────────
    const cs = store.cellSize
    const hc = cs / 2
    const ox = store.gridNormOX
    const oy = store.gridNormOY

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
        ctx.fillRect(c * hc + ox, r * hc + oy, hc, hc)
      }
    } else {
      // Режим админа: зона только для выбранного токена.
      const selected = getSelectedToken(store.placedTokens, store.selectedPlacedUid)

      if (isNonSystemToken(selected)) {
        const mp = selected.movementPoints ?? 0
        const reachable = mp > 0 ? buildReachableCells(selected, store.walls, mp) : new Set()

        ctx.fillStyle = 'rgba(74, 222, 128, 0.25)'
        for (const key of reachable) {
          const [c, r] = key.split(',').map(Number)
          ctx.fillRect(c * hc + ox, r * hc + oy, hc, hc)
        }

        // ── Фантомный путь при ховере ─────────────────────────────────────────
        const hcell = store.hoveredCell
        if (hcell) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.20)'
          ctx.fillRect(hcell.col * hc + ox, hcell.row * hc + oy, cs, cs)
        }

        // ── Превью зоны AoE-способности ───────────────────────────────────────
        const aoeCells = store.abilityPreviewCells
        if (aoeCells.length) {
          const ability = store.pendingAbility
          const abilityColor = ability?.color ?? '#f97316'
          ctx.fillStyle = `${abilityColor}33` // ~20% opacity
          ctx.strokeStyle = `${abilityColor}99` // ~60% opacity
          ctx.lineWidth = 1.5
          for (const cell of aoeCells) {
            const cx = cell.col * hc + ox
            const cy = cell.row * hc + oy
            ctx.fillRect(cx, cy, hc, hc)
            ctx.strokeRect(cx, cy, hc, hc)
          }
        }

        const path = store.hoveredPath
        if (path && path.length > 0) {
          // Начальная точка — центр 2×2 токена
          const startX = selected.col * hc + ox + hc
          const startY = selected.row * hc + oy + hc

          // Линия пути
          ctx.beginPath()
          ctx.moveTo(startX, startY)
          for (const step of path) {
            ctx.lineTo(step.col * hc + ox + hc, step.row * hc + oy + hc)
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
            ctx.arc(step.col * hc + ox + hc, step.row * hc + oy + hc, 3, 0, Math.PI * 2)
            ctx.fill()
          }

          // Конечная точка — крупнее
          const last = path[path.length - 1]
          ctx.fillStyle = 'rgba(250, 204, 21, 1)'
          ctx.beginPath()
          ctx.arc(last.col * hc + ox + hc, last.row * hc + oy + hc, 5, 0, Math.PI * 2)
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
        ctx.fillRect(w.col * hc + ox, w.row * hc + oy, hc, hc)
      }
    }

    // ─── Превью зоны дропа ─────────────────────────────────────────────────
    const dropCell = store.dropPreviewCell
    if (dropCell) {
      ctx.fillStyle = 'rgba(96, 165, 250, 0.35)'
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)'
      ctx.lineWidth = 2
      const dx = dropCell.col * hc + ox
      const dy = dropCell.row * hc + oy
      const dw = dropCell.quarterSize ? hc : dropCell.halfSize ? hc : cs
      const dh = dropCell.quarterSize ? hc : cs
      ctx.fillRect(dx, dy, dw, dh)
      ctx.strokeRect(dx, dy, dw, dh)
    }

    // ─── Sub-grid (тонкие пунктирные линии — делят ячейку на 2×2) ─────────
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    for (let x = ox + hc; x < canvas.width; x += cs) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
    }
    for (let y = oy + hc; y < canvas.height; y += cs) {
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // ─── Основная сетка (поверх sub-grid) ─────────────────────────────────────
    ctx.beginPath()
    ctx.strokeStyle = store.colorGrid
    ctx.lineWidth = 1

    for (let x = ox; x <= canvas.width; x += cs) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
    }
    for (let y = oy; y <= canvas.height; y += cs) {
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
      () => store.gridOffsetX,
      () => store.gridOffsetY,
      () => store.selectedPlacedUid,
      () => store.placedTokens.map((t) => `${t.uid}:${t.col}:${t.row}:${t.attitude}`).join(','),
      () => store.hoveredPath.map((s) => `${s.col},${s.row}`).join(','),
      () => `${store.hoveredCell?.col},${store.hoveredCell?.row}`,
      () =>
        `${store.dropPreviewCell?.col},${store.dropPreviewCell?.row},${store.dropPreviewCell?.halfSize},${store.dropPreviewCell?.quarterSize}`,
      () => store.walls.map((w) => `${w.col}:${w.row}`).join(','),
      () => store.abilityPreviewCells.map((c) => `${c.col}:${c.row}`).join(','),
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

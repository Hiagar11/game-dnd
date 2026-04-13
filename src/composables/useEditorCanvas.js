// Composable для управления canvas в редакторе карт.
// Инкапсулирует: рисование карты + сетки (с sub-grid 2×2), зум (Ctrl + колесо),
// пан камеры (ПКМ), перемещение сетки по карте (ЛКМ drag).
//
// gridOffsetX/gridOffsetY — смещение сетки в пикселях относительно начала карты.
// Позволяет точно наложить сетку на рисунок карты.

import { ref, computed } from 'vue'

export function useEditorCanvas() {
  // ─── Рефы на DOM ────────────────────────────────────────────────────────────
  const previewCanvasRef = ref(null)
  const canvasWrapRef = ref(null)

  // Кешируем загруженный HTMLImageElement
  let previewImage = null

  // ─── Зум и пан камеры ────────────────────────────────────────────────────────
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)

  const canvasTransformStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    transformOrigin: '0 0',
  }))

  // ─── Смещение сетки (drag по ЛКМ) ───────────────────────────────────────────
  // Хранится в форме (Map.gridOffsetX/Y), передаётся извне через setGridOffset.
  const gridOffsetX = ref(0)
  const gridOffsetY = ref(0)

  function setGridOffset(x, y) {
    gridOffsetX.value = x
    gridOffsetY.value = y
  }

  function fitToViewport() {
    if (!previewImage || !canvasWrapRef.value) return
    const { clientWidth: vw, clientHeight: vh } = canvasWrapRef.value
    const { naturalWidth: iw, naturalHeight: ih } = previewImage
    const scale = Math.min(vw / iw, vh / ih)
    zoom.value = scale
    panX.value = (vw - iw * scale) / 2
    panY.value = (vh - ih * scale) / 2
  }

  // ─── Ctrl + колёсико → зум ───────────────────────────────────────────────────
  function onWheel(e) {
    if (!e.ctrlKey) return
    const oldZoom = zoom.value
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const newZoom = Math.max(0.05, Math.min(10, oldZoom * factor))

    const wrap = canvasWrapRef.value
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    panX.value = mx - (mx - panX.value) * (newZoom / oldZoom)
    panY.value = my - (my - panY.value) * (newZoom / oldZoom)
    zoom.value = newZoom
  }

  // ─── Пан камеры (ПКМ) ───────────────────────────────────────────────────────
  const isPanning = ref(false)
  let panStartX = 0
  let panStartY = 0
  let panOriginX = 0
  let panOriginY = 0

  function onPanStart(e) {
    isPanning.value = true
    panStartX = e.clientX
    panStartY = e.clientY
    panOriginX = panX.value
    panOriginY = panY.value
  }

  function onPanMove(e) {
    // Пан камеры (ПКМ)
    if (isPanning.value) {
      panX.value = panOriginX + (e.clientX - panStartX)
      panY.value = panOriginY + (e.clientY - panStartY)
    }
    // Drag сетки (ЛКМ)
    if (isDraggingGrid.value) {
      gridOffsetX.value = gridDragOriginX + (e.clientX - gridDragStartX) / zoom.value
      gridOffsetY.value = gridDragOriginY + (e.clientY - gridDragStartY) / zoom.value
    }
  }

  function onPanEnd() {
    isPanning.value = false
  }

  // ─── Drag сетки (ЛКМ) ───────────────────────────────────────────────────────
  const isDraggingGrid = ref(false)
  let gridDragStartX = 0
  let gridDragStartY = 0
  let gridDragOriginX = 0
  let gridDragOriginY = 0

  function onGridDragStart(e) {
    // Только ЛКМ (button === 0) и без Ctrl (Ctrl+wheel = зум)
    if (e.button !== 0) return
    isDraggingGrid.value = true
    gridDragStartX = e.clientX
    gridDragStartY = e.clientY
    gridDragOriginX = gridOffsetX.value
    gridDragOriginY = gridOffsetY.value
  }

  // ─── onChangeComplete: вызывается при mouse-up ЛКМ ──────────────────────────
  // Родительский компонент может подписаться, чтобы синхронизировать form.gridOffsetX/Y.
  let _onGridOffsetChange = null

  function onGridOffsetChange(cb) {
    _onGridOffsetChange = cb
  }

  function onGridDragEndWithCallback() {
    if (isDraggingGrid.value) {
      isDraggingGrid.value = false
      _onGridOffsetChange?.(gridOffsetX.value, gridOffsetY.value)
    }
  }

  // ─── Рисование ───────────────────────────────────────────────────────────────
  /**
   * Рисует карту + сетку с sub-grid (2×2 внутри каждой ячейки).
   * Основная сетка — жирные линии, sub-grid — тонкие пунктирные.
   * @param {number} cellSize — размер ячейки в пикселях
   */
  function drawPreview(cellSize) {
    const canvas = previewCanvasRef.value
    if (!canvas || !previewImage) return

    canvas.width = previewImage.naturalWidth
    canvas.height = previewImage.naturalHeight

    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    // Нормализуем offset в диапазон [0, cellSize) чтобы сетка визуально «зацикливалась»
    const ox = ((gridOffsetX.value % cellSize) + cellSize) % cellSize
    const oy = ((gridOffsetY.value % cellSize) + cellSize) % cellSize

    // 1. Карта
    ctx.drawImage(previewImage, 0, 0)

    // 2. Sub-grid (тонкие пунктирные линии — делят ячейку на 2×2)
    const half = cellSize / 2
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    // Вертикальные суб-линии (между основными)
    for (let x = ox + half; x < w; x += cellSize) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    // Горизонтальные суб-линии (между основными)
    for (let y = oy + half; y < h; y += cellSize) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // 3. Основная сетка (жирные линии)
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.lineWidth = 2

    for (let x = ox; x <= w; x += cellSize) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = oy; y <= h; y += cellSize) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
  }

  function loadImageAndDraw(url, cellSize) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    img.onload = () => {
      previewImage = img
      drawPreview(cellSize)
      fitToViewport()
    }
  }

  function clearImage() {
    previewImage = null
  }

  return {
    previewCanvasRef,
    canvasWrapRef,
    canvasTransformStyle,
    isPanning,
    isDraggingGrid,
    gridOffsetX,
    gridOffsetY,
    setGridOffset,
    loadImageAndDraw,
    drawPreview,
    clearImage,
    onWheel,
    onPanStart,
    onPanMove,
    onPanEnd,
    onGridDragStart,
    onGridDragEnd: onGridDragEndWithCallback,
    onGridOffsetChange,
  }
}

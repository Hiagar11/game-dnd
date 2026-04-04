// Composable для управления canvas в редакторе сценариев.
// Инкапсулирует: рисование карты + сетки, зум (Ctrl + колесо), пан (ПКМ).
//
// Использование:
//   const { previewCanvasRef, canvasWrapRef, ... } = useEditorCanvas()
//
// drawPreview(cellSize) — перерисовывает текущее изображение с новым размером ячейки.
// loadImageAndDraw(url, cellSize) — загружает изображение, рисует, вписывает в экран.
// clearImage() — сбрасывает текущее изображение (при смене сценария).

import { ref, computed } from 'vue'

export function useEditorCanvas() {
  // ─── Рефы на DOM ────────────────────────────────────────────────────────────
  const previewCanvasRef = ref(null)
  const canvasWrapRef = ref(null)

  // Кешируем загруженный HTMLImageElement — чтобы не перезагружать при каждой
  // перерисовке сетки (только при смене URL).
  let previewImage = null

  // ─── Зум ─────────────────────────────────────────────────────────────────────
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)

  // transform-origin: 0 0 — смещение под курсором считаем вручную (см. onWheel).
  const canvasTransformStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    transformOrigin: '0 0',
  }))

  /**
   * Вписывает карту в контейнер как object-fit: contain.
   * Вызывается сразу после первой загрузки изображения.
   */
  function fitToViewport() {
    if (!previewImage || !canvasWrapRef.value) return
    const { clientWidth: vw, clientHeight: vh } = canvasWrapRef.value
    const { naturalWidth: iw, naturalHeight: ih } = previewImage
    const scale = Math.min(vw / iw, vh / ih)
    zoom.value = scale
    panX.value = (vw - iw * scale) / 2
    panY.value = (vh - ih * scale) / 2
  }

  /**
   * Ctrl + колёсико мыши — зум под курсором.
   * Точка под мышью остаётся на месте: вычитаем лишнее смещение.
   * @param {WheelEvent} e
   */
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

    // mx = panX + canvasX * zoom  →  canvasX = (mx - panX) / zoom
    // После смены зума: newPanX = mx - canvasX * newZoom
    panX.value = mx - (mx - panX.value) * (newZoom / oldZoom)
    panY.value = my - (my - panY.value) * (newZoom / oldZoom)
    zoom.value = newZoom
  }

  // ─── Пан по правой кнопке мыши ──────────────────────────────────────────────
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
    if (!isPanning.value) return
    panX.value = panOriginX + (e.clientX - panStartX)
    panY.value = panOriginY + (e.clientY - panStartY)
  }

  function onPanEnd() {
    isPanning.value = false
  }

  // ─── Рисование ───────────────────────────────────────────────────────────────
  /**
   * Перерисовывает текущую карту + сетку.
   * Вызывается при изменении cellSize (без повторной загрузки изображения).
   * @param {number} cellSize — размер ячейки в пикселях
   */
  function drawPreview(cellSize) {
    const canvas = previewCanvasRef.value
    if (!canvas || !previewImage) return

    canvas.width = previewImage.naturalWidth
    canvas.height = previewImage.naturalHeight

    const ctx = canvas.getContext('2d')

    // 1. Карта
    ctx.drawImage(previewImage, 0, 0)

    // 2. Сетка поверх. Линии чуть толще — при масштабировании canvas
    //    вниз они выглядели бы размытыми/тонкими.
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.lineWidth = 2

    for (let x = 0; x <= canvas.width; x += cellSize) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
    }
    for (let y = 0; y <= canvas.height; y += cellSize) {
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
    }

    ctx.stroke()
  }

  /**
   * Загружает изображение по URL, рисует карту + сетку, вписывает в экран.
   * crossOrigin нужен при загрузке с другого порта (сервер :3000, фронт :5173).
   * @param {string} url
   * @param {number} cellSize
   */
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

  /** Сбрасывает текущее изображение. Вызывается при смене сценария. */
  function clearImage() {
    previewImage = null
  }

  return {
    previewCanvasRef,
    canvasWrapRef,
    canvasTransformStyle,
    isPanning,
    loadImageAndDraw,
    drawPreview,
    clearImage,
    onWheel,
    onPanStart,
    onPanMove,
    onPanEnd,
  }
}

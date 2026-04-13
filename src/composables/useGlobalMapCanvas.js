// Composable для canvas глобальной карты.
// Рисует изображение + остановки (кружки) + маршруты (линии между остановками).
// Зум (Ctrl + колесо), пан камеры (ПКМ).
// ЛКМ — размещение / выделение остановок.

import { ref, computed } from 'vue'

// Радиус точки остановки (пиксели изображения)
const STOP_RADIUS = 28
const STOP_HIT_RADIUS = 40
const PATH_HIT_DISTANCE = 12

export function useGlobalMapCanvas() {
  const canvasRef = ref(null)
  const canvasWrapRef = ref(null)

  let image = null

  // ─── Зум и пан ──────────────────────────────────────────────────────────────
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)

  const canvasTransformStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    transformOrigin: '0 0',
  }))

  function fitToViewport() {
    if (!image || !canvasWrapRef.value) return
    const { clientWidth: vw, clientHeight: vh } = canvasWrapRef.value
    const { naturalWidth: iw, naturalHeight: ih } = image
    const scale = Math.min(vw / iw, vh / ih)
    zoom.value = scale
    panX.value = (vw - iw * scale) / 2
    panY.value = (vh - ih * scale) / 2
  }

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
    if (isPanning.value) {
      panX.value = panOriginX + (e.clientX - panStartX)
      panY.value = panOriginY + (e.clientY - panStartY)
    }
    if (isDraggingStop.value) {
      const pos = clientToImage(e.clientX, e.clientY)
      if (pos) _onStopDrag?.(pos.x, pos.y)
    }
  }

  function onPanEnd() {
    isPanning.value = false
  }

  // ─── Утилита: screen → image координаты ─────────────────────────────────────
  function clientToImage(clientX, clientY) {
    const wrap = canvasWrapRef.value
    if (!wrap) return null
    const rect = wrap.getBoundingClientRect()
    const x = (clientX - rect.left - panX.value) / zoom.value
    const y = (clientY - rect.top - panY.value) / zoom.value
    return { x, y }
  }

  // ─── Drag остановки (ЛКМ) ──────────────────────────────────────────────────
  const isDraggingStop = ref(false)
  let _onStopDrag = null
  let _onStopDragEnd = null

  function startStopDrag(onDrag, onDragEnd) {
    isDraggingStop.value = true
    _onStopDrag = onDrag
    _onStopDragEnd = onDragEnd
  }

  function endStopDrag() {
    if (isDraggingStop.value) {
      isDraggingStop.value = false
      _onStopDragEnd?.()
      _onStopDrag = null
      _onStopDragEnd = null
    }
  }

  // ─── Рисование ──────────────────────────────────────────────────────────────
  /**
   * Рисует глобальную карту: изображение + маршруты + остановки.
   * @param {Array} stops   [{uid, x, y, label, scenarioId}]
   * @param {Array} paths   [{from, to, waypoints:[{x,y}]}]
   * @param {string|null} selectedStopUid — выделенная остановка
   * @param {string|null} drawingFrom — uid начала рисуемого пути (режим рисования маршрута)
   * @param {{x:number,y:number}|null} mousePos — текущая позиция мыши (для preview линии)
   * @param {Array} pendingWaypoints — промежуточные точки строящегося маршрута
   * @param {string|null} hoveredPathKey — ключ подсвеченного маршрута ("from|to")
   */
  function draw(
    stops,
    paths,
    selectedStopUid = null,
    drawingFrom = null,
    mousePos = null,
    pendingWaypoints = [],
    hoveredPathKey = null
  ) {
    const canvas = canvasRef.value
    if (!canvas || !image) return

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const ctx = canvas.getContext('2d')

    // 1. Изображение
    ctx.drawImage(image, 0, 0)

    // 2. Маршруты (линии)
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const p of paths) {
      const fromStop = stops.find((s) => s.uid === p.from)
      const toStop = stops.find((s) => s.uid === p.to)
      if (!fromStop || !toStop) continue

      const key = `${p.from}|${p.to}`
      const isHovered = key === hoveredPathKey

      ctx.beginPath()
      ctx.moveTo(fromStop.x, fromStop.y)
      for (const wp of p.waypoints ?? []) {
        ctx.lineTo(wp.x, wp.y)
      }
      ctx.lineTo(toStop.x, toStop.y)
      ctx.strokeStyle = isHovered ? 'rgba(239, 68, 68, 0.9)' : 'rgba(250, 204, 21, 0.8)'
      ctx.lineWidth = isHovered ? 6 : 4
      ctx.stroke()
    }

    // 3. Preview-линия при рисовании пути (включая промежуточные waypoints)
    if (drawingFrom) {
      const src = stops.find((s) => s.uid === drawingFrom)
      if (src) {
        // Уже зафиксированные сегменты (сплошная линия)
        if (pendingWaypoints.length > 0) {
          ctx.beginPath()
          ctx.moveTo(src.x, src.y)
          for (const wp of pendingWaypoints) ctx.lineTo(wp.x, wp.y)
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)'
          ctx.lineWidth = 4
          ctx.stroke()
        }

        // Линия от последней точки до мыши (пунктир)
        if (mousePos) {
          const last =
            pendingWaypoints.length > 0 ? pendingWaypoints[pendingWaypoints.length - 1] : src
          ctx.beginPath()
          ctx.moveTo(last.x, last.y)
          ctx.lineTo(mousePos.x, mousePos.y)
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)'
          ctx.setLineDash([8, 5])
          ctx.lineWidth = 3
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }

    // 4. Остановки (кружки)
    for (const s of stops) {
      const isSelected = s.uid === selectedStopUid
      const hasScenario = !!s.scenarioId

      // Внешний круг
      ctx.beginPath()
      ctx.arc(s.x, s.y, STOP_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = hasScenario ? 'rgba(74, 222, 128, 0.9)' : 'rgba(148, 163, 184, 0.9)'
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = '#facc15'
        ctx.lineWidth = 3
        ctx.stroke()
      } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Подпись
      if (s.label) {
        ctx.font = 'bold 26px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.lineWidth = 5
        const labelY = s.y + STOP_RADIUS + 6
        ctx.strokeText(s.label, s.x, labelY)
        ctx.fillText(s.label, s.x, labelY)
      }
    }
  }

  /** По координатам изображения ищем остановку под курсором */
  function hitTestStop(imgX, imgY, stops) {
    for (let i = stops.length - 1; i >= 0; i--) {
      const s = stops[i]
      const dx = imgX - s.x
      const dy = imgY - s.y
      if (dx * dx + dy * dy <= STOP_HIT_RADIUS * STOP_HIT_RADIUS) return s
    }
    return null
  }

  /** Расстояние от точки до отрезка */
  function _distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax
    const dy = by - ay
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.hypot(px - ax, py - ay)
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
  }

  /** По координатам изображения ищем маршрут под курсором */
  function hitTestPath(imgX, imgY, paths, stops) {
    for (let i = paths.length - 1; i >= 0; i--) {
      const p = paths[i]
      const fromStop = stops.find((s) => s.uid === p.from)
      const toStop = stops.find((s) => s.uid === p.to)
      if (!fromStop || !toStop) continue

      const points = [fromStop, ...(p.waypoints ?? []), toStop]
      for (let j = 0; j < points.length - 1; j++) {
        const a = points[j]
        const b = points[j + 1]
        if (_distToSegment(imgX, imgY, a.x, a.y, b.x, b.y) <= PATH_HIT_DISTANCE) return p
      }
    }
    return null
  }

  function loadImageAndDraw(url, stops, paths) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    img.onload = () => {
      image = img
      draw(stops, paths)
      fitToViewport()
    }
  }

  function clearImage() {
    image = null
  }

  return {
    canvasRef,
    canvasWrapRef,
    canvasTransformStyle,
    isPanning,
    isDraggingStop,
    clientToImage,
    hitTestStop,
    hitTestPath,
    loadImageAndDraw,
    draw,
    clearImage,
    onWheel,
    onPanStart,
    onPanMove,
    onPanEnd,
    startStopDrag,
    endStopDrag,
  }
}

<template>
  <Teleport to="body">
    <!-- ── Попап подтверждения ────────────────────────────────────────────── -->
    <Transition name="popup-fade">
      <div v-if="phase === 'confirm'" class="gm-confirm" @click.self="$emit('cancel')">
        <div class="gm-confirm__box">
          <p class="gm-confirm__text">Покинуть локацию и выйти на глобальную карту?</p>
          <div class="gm-confirm__actions">
            <button class="gm-confirm__btn gm-confirm__btn--yes" @click="$emit('confirm')">
              Да, в путь
            </button>
            <button class="gm-confirm__btn gm-confirm__btn--no" @click="$emit('cancel')">
              Остаться
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Полноэкранный оверлей глобальной карты ────────────────────────── -->
    <Transition name="gm-fade" @after-enter="onFadeInDone" @after-leave="onFadeOutDone">
      <div v-if="showOverlay" class="gm-overlay" @keydown.esc="onEsc">
        <!-- Канвас карты -->
        <div
          ref="wrapRef"
          class="gm-overlay__canvas-wrap"
          tabindex="-1"
          @click.left="onCanvasClick"
          @mousedown.right.prevent="onPanStart"
          @mousemove="onPanMove"
          @mouseup.right="onPanEnd"
          @mouseleave="onPanEnd"
          @contextmenu.prevent
          @keydown.esc="onEsc"
        >
          <div class="gm-overlay__scene" :style="canvasStyle">
            <canvas ref="cvRef" class="gm-overlay__canvas" />

            <!-- Токен колесницы -->
            <div v-if="chariotPos" class="gm-overlay__chariot" :style="chariotStyle">
              <span class="gm-overlay__chariot-icon">🐴</span>
            </div>
          </div>

          <!-- Маркеры остановок (screen-space, не масштабируются зумом) -->
          <div
            v-for="stop in globalMap?.stops ?? []"
            :key="'m-' + stop.uid"
            class="gm-overlay__marker"
            :class="markerClasses(stop)"
            :style="markerStyle(stop)"
          >
            <div class="gm-overlay__marker-ping" />
            <div class="gm-overlay__marker-core" />
            <span v-if="stop.label" class="gm-overlay__marker-label">{{ stop.label }}</span>
          </div>

          <!-- Кнопки выбора направления -->
          <template v-if="phase === 'choosing'">
            <button
              v-for="stop in reachableStops"
              :key="stop.uid"
              class="gm-overlay__dest"
              :style="screenStopStyle(stop)"
              @click.left="$emit('choose', stop.uid)"
            >
              {{ stop.label || 'Безымянная' }}
            </button>
          </template>

          <!-- Цикл день/ночь при путешествии -->
          <div class="gm-overlay__daynight" :style="dayNightStyle" />
        </div>

        <!-- Текстовая подсказка -->
        <div class="gm-overlay__hint">
          <template v-if="phase === 'choosing'">Выберите пункт назначения</template>
          <template v-if="phase === 'traveling'">Путешествие…</template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  import { ref, computed, watch, nextTick, onBeforeUnmount, onMounted, onUnmounted } from 'vue'

  const props = defineProps({
    phase: { type: String, required: true },
    globalMap: { type: Object, default: null },
    sourceStop: { type: Object, default: null },
    targetStop: { type: Object, default: null },
    chariotProgress: { type: Number, default: 0 },
    reachableStops: { type: Array, default: () => [] },
    pathPoints: { type: Array, default: () => [] },
  })

  const emit = defineEmits(['confirm', 'cancel', 'choose', 'enter-complete', 'exit-complete'])

  const wrapRef = ref(null)
  const cvRef = ref(null)
  let image = null

  // Зум / пан
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)

  const canvasStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    transformOrigin: '0 0',
  }))

  const showOverlay = computed(() => ['entering', 'choosing', 'traveling'].includes(props.phase))

  // ── Загрузка изображения и отрисовка ──────────────────────────────────────

  watch(
    () => props.globalMap,
    (map) => {
      if (!map?.imageUrl) return
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = map.imageUrl
      img.onload = () => {
        image = img
        nextTick(() => drawMap())
        fitToViewport()
      }
    }
  )

  watch(
    () => props.phase,
    (p) => {
      if (p === 'choosing' || p === 'traveling') nextTick(() => drawMap())
    }
  )

  function fitToViewport() {
    if (!image || !wrapRef.value) return
    const { clientWidth: vw, clientHeight: vh } = wrapRef.value
    const { naturalWidth: iw, naturalHeight: ih } = image
    const scale = Math.min(vw / iw, vh / ih)
    zoom.value = scale
    panX.value = (vw - iw * scale) / 2
    panY.value = (vh - ih * scale) / 2
  }

  function drawMap() {
    const canvas = cvRef.value
    if (!canvas || !image) return
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')

    ctx.drawImage(image, 0, 0)

    const map = props.globalMap
    if (!map) return

    // Маршруты — свечение + пунктир
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const p of map.paths) {
      const from = map.stops.find((s) => s.uid === p.from)
      const to = map.stops.find((s) => s.uid === p.to)
      if (!from || !to) continue

      const pts = [from, ...(p.waypoints ?? []), to]

      // Внешнее свечение
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.lineWidth = 12
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.12)'
      ctx.shadowColor = 'rgba(250, 204, 21, 0.35)'
      ctx.shadowBlur = 18
      ctx.stroke()
      ctx.restore()

      // Основная пунктирная линия
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)'
      ctx.setLineDash([14, 10])
      ctx.stroke()
      ctx.restore()
    }
  }

  // ── Позиция колесницы (интерполяция по polyline) ───────────────────────────

  const chariotPos = computed(() => {
    const pts = props.pathPoints
    if (!pts.length) {
      // Нет маршрута — стоим на исходной остановке
      return props.sourceStop ? { x: props.sourceStop.x, y: props.sourceStop.y } : null
    }

    const t = props.chariotProgress

    // Считаем длины отрезков
    const segs = []
    let total = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1].x - pts[i].x
      const dy = pts[i + 1].y - pts[i].y
      const len = Math.hypot(dx, dy)
      segs.push(len)
      total += len
    }
    if (total === 0) return { x: pts[0].x, y: pts[0].y }

    const dist = t * total
    let acc = 0
    for (let i = 0; i < segs.length; i++) {
      if (acc + segs[i] >= dist) {
        const frac = (dist - acc) / segs[i]
        return {
          x: pts[i].x + (pts[i + 1].x - pts[i].x) * frac,
          y: pts[i].y + (pts[i + 1].y - pts[i].y) * frac,
        }
      }
      acc += segs[i]
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y }
  })

  const chariotStyle = computed(() => {
    if (!chariotPos.value) return { display: 'none' }
    return {
      left: `${chariotPos.value.x}px`,
      top: `${chariotPos.value.y}px`,
    }
  })

  // ── Цикл день/ночь ────────────────────────────────────────────────────────

  const dayNightOpacity = computed(() => {
    const t = props.chariotProgress
    if (t <= 0.15) return 0
    if (t <= 0.35) return ((t - 0.15) / 0.2) * 0.65
    if (t <= 0.65) return 0.65
    if (t <= 0.85) return ((0.85 - t) / 0.2) * 0.65
    return 0
  })

  const dayNightStyle = computed(() => ({
    opacity: dayNightOpacity.value,
  }))

  // ── Маркеры остановок ─────────────────────────────────────────────────────

  const reachableUids = computed(() => new Set(props.reachableStops.map((s) => s.uid)))

  function markerClasses(stop) {
    return {
      'gm-overlay__marker--source': stop.uid === props.sourceStop?.uid,
      'gm-overlay__marker--reachable':
        props.phase === 'choosing' && reachableUids.value.has(stop.uid),
      'gm-overlay__marker--linked': !!stop.scenarioId,
    }
  }

  function markerStyle(stop) {
    return {
      left: `${panX.value + stop.x * zoom.value}px`,
      top: `${panY.value + stop.y * zoom.value}px`,
    }
  }

  /** Позиция кнопки выбора (над маркером) */
  function screenStopStyle(stop) {
    return {
      left: `${panX.value + stop.x * zoom.value}px`,
      top: `${panY.value + stop.y * zoom.value - 54}px`,
    }
  }

  // ── Клик по канвасу → выбор остановки ─────────────────────────────────────

  const STOP_HIT_RADIUS = 40

  /** Пересчёт viewport-координат → координаты на изображении */
  function clientToImage(clientX, clientY) {
    const wrap = wrapRef.value
    if (!wrap) return null
    const rect = wrap.getBoundingClientRect()
    const x = (clientX - rect.left - panX.value) / zoom.value
    const y = (clientY - rect.top - panY.value) / zoom.value
    return { x, y }
  }

  function onCanvasClick(e) {
    if (props.phase !== 'choosing') return
    const pos = clientToImage(e.clientX, e.clientY)
    if (!pos) return

    for (const stop of props.reachableStops) {
      const dx = pos.x - stop.x
      const dy = pos.y - stop.y
      if (dx * dx + dy * dy <= STOP_HIT_RADIUS * STOP_HIT_RADIUS) {
        emit('choose', stop.uid)
        return
      }
    }
  }

  // ── Pan камеры (перетягивание курсором) ──────────────────────────────────

  let isPanning = false
  let panStartX = 0
  let panStartY = 0
  let panOriginX = 0
  let panOriginY = 0

  function onPanStart(e) {
    isPanning = true
    panStartX = e.clientX
    panStartY = e.clientY
    panOriginX = panX.value
    panOriginY = panY.value
  }

  function onPanMove(e) {
    if (!isPanning) return
    panX.value = panOriginX + (e.clientX - panStartX)
    panY.value = panOriginY + (e.clientY - panStartY)
  }

  function onPanEnd() {
    isPanning = false
  }

  // ── Transition hooks ──────────────────────────────────────────────────────

  function onFadeInDone() {
    wrapRef.value?.focus()
    emit('enter-complete')
  }

  function onFadeOutDone() {
    emit('exit-complete')
  }

  // ── ESC — отмена ───────────────────────────────────────────────────────

  function onEsc() {
    if (props.phase === 'confirm' || props.phase === 'choosing') {
      emit('cancel')
    }
  }

  function onGlobalKeydown(e) {
    if (e.key === 'Escape' && props.phase === 'confirm') {
      emit('cancel')
    }
  }

  onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))

  onBeforeUnmount(() => {
    image = null
  })
</script>

<style scoped lang="scss" src="../assets/styles/components/gameGlobalMapOverlay.scss"></style>

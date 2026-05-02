<template>
  <!-- Прозрачный div с backdrop-filter над зоной — искажает карту/токены позади него -->
  <div v-if="active" class="grav-distort-zone" :style="zoneStyle" aria-hidden="true" />

  <!-- SVG с определением фильтра (нулевой размер, глобально доступен по ID) -->
  <svg class="grav-distort-defs" aria-hidden="true">
    <defs>
      <filter id="grav-local-wave" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence
          ref="turbRef"
          type="turbulence"
          baseFrequency="0.020 0.014"
          numOctaves="3"
          seed="9"
          result="noise"
        />
        <feDisplacementMap
          ref="dispRef"
          in="SourceGraphic"
          in2="noise"
          scale="0"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
</template>

<script setup>
  import { ref, computed, watch, onUnmounted } from 'vue'
  import { useGameStore } from '../stores/game'

  const store = useGameStore()

  const active = ref(false)
  const zoneCol = ref(0)
  const zoneRow = ref(0)
  const turbRef = ref(null)
  const dispRef = ref(null)

  // Должно совпадать с VFX_MS в GameGravityCrushVfx
  const VFX_MS = 2200
  // Отступ за пределы зоны чтобы displacement не обрезался по краям
  const PAD = 28

  const hc = computed(() => store.cellSize / 2)

  // Зона 2×2 реальных клетки = 4×4 полуклетки, курсор = центр (col, row)
  const zoneStyle = computed(() => {
    const h = hc.value
    const ox = store.gridNormOX
    const oy = store.gridNormOY
    const C = zoneCol.value
    const R = zoneRow.value
    const side = 4 * h
    return {
      left: `${(C - 2) * h + ox - PAD}px`,
      top: `${(R - 2) * h + oy - PAD}px`,
      width: `${side + PAD * 2}px`,
      height: `${side + PAD * 2}px`,
    }
  })

  let rafId = null

  function animate(startTime) {
    const elapsed = performance.now() - startTime
    const t = Math.min(elapsed / VFX_MS, 1)

    // Огибающая: резкий удар на 12%, плавный спад
    const env = t < 0.12 ? t / 0.12 : Math.pow(1 - (t - 0.12) / 0.88, 1.8)

    const scale = 22 * env

    // Частота слегка осциллирует — волны «дышат»
    const osc = 0.006 * Math.sin(elapsed * 0.01)
    const freqX = (0.02 + osc).toFixed(4)
    const freqY = (0.014 + osc * 0.7).toFixed(4)

    dispRef.value?.setAttribute('scale', scale.toFixed(2))
    turbRef.value?.setAttribute('baseFrequency', `${freqX} ${freqY}`)

    if (t < 1) {
      rafId = requestAnimationFrame(() => animate(startTime))
    } else {
      dispRef.value?.setAttribute('scale', '0')
      active.value = false
      rafId = null
    }
  }

  watch(
    () => store.abilityVfx,
    (v) => {
      if (v?.type !== 'gravity_crush') return
      zoneCol.value = v.col
      zoneRow.value = v.row
      active.value = true

      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      rafId = requestAnimationFrame(() => animate(performance.now()))
    }
  )

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })
</script>

<style lang="scss" scoped>
  .grav-distort-zone {
    position: absolute;
    z-index: 5;
    pointer-events: none;

    /* Искажает всё позади элемента — карту и токены */
    /* stylelint-disable-next-line property-no-vendor-prefix */
    -webkit-backdrop-filter: url('#grav-local-wave');
    backdrop-filter: url('#grav-local-wave');
  }

  .grav-distort-defs {
    position: absolute;
    width: 0;
    height: 0;
    overflow: visible;
    pointer-events: none;
  }
</style>

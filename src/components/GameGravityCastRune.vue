<template>
  <div v-if="visible" class="gravity-cast-rune" :style="posStyle" aria-hidden="true">
    <svg
      class="gravity-cast-rune__svg"
      :width="runeSize"
      :height="runeSize"
      viewBox="-12 -12 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="grav-rune-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="white-glow" />
          <feMerge>
            <feMergeNode in="white-glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#grav-rune-glow)">
        <path
          d="M0 -10 V10 M0 -3 L8 -10 M0 3 L8 10 M0 -3 L-8 -10 M0 3 L-8 10"
          stroke="#ffffff"
          fill="none"
          stroke-width="4.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M0 -10 V10 M0 -3 L8 -10 M0 3 L8 10 M0 -3 L-8 -10 M0 3 L-8 10"
          stroke="#a855f7"
          fill="none"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="0" cy="0" r="3.4" fill="#ffffff" />
        <circle cx="0" cy="0" r="2.2" fill="#a855f7" />
      </g>
    </svg>
  </div>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useGameStore } from '../stores/game'

  const store = useGameStore()

  // Хранит позицию независимо от abilityVfx — стор переключается на
  // 'gravity_crush' в момент взрыва, но руна должна оставаться.
  const castPos = ref(null)
  const visible = computed(() => castPos.value !== null)

  // cast + flight + Lottie VFX
  const TOTAL_MS = 3400

  const runeSize = computed(() => store.cellSize / 4)
  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  const posStyle = computed(() => {
    if (!castPos.value) return {}
    const { col, row } = castPos.value
    const rs = runeSize.value
    const x = col * hc.value + ox.value + rs * 0.5
    const y = row * hc.value + oy.value - rs * 0.5 - 2
    return { left: `${x}px`, top: `${y}px` }
  })

  watch(
    () => store.abilityVfx,
    (v) => {
      if (v?.type !== 'gravityCast') return
      castPos.value = { col: v.col, row: v.row }
      setTimeout(() => {
        castPos.value = null
      }, TOTAL_MS)
    }
  )
</script>

<style lang="scss" scoped>
  .gravity-cast-rune {
    position: absolute;
    z-index: 8;
    pointer-events: none;
    transform: translate(-50%, -50%);
    animation: grav-rune-show 2.7s ease-out forwards;
  }

  @keyframes grav-rune-show {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.2);
    }

    8% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.15);
    }

    15% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }

    85% {
      opacity: 0.9;
      transform: translate(-50%, -50%) scale(1);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.85);
    }
  }
</style>

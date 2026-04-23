<template>
  <!--
    Каст кровавой магии: руны появляются по очереди, вращаются, расширяются
    и резко схлопываются в центр перед выстрелом.
    Запускается через store.abilityVfx = { type: 'bloodCast', col, row, color }
  -->
  <div v-if="cast" class="blood-cast" :style="posStyle">
    <svg class="blood-cast__svg" viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="rune-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle class="blood-cast__ring blood-cast__ring--outer" r="66" :stroke="castColor" />
      <circle class="blood-cast__ring blood-cast__ring--inner" r="43" :stroke="castColor" />

      <!-- Внешнее кольцо: плавный разгон -->
      <g class="blood-cast__orbit-group">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 0 0"
          to="560 0 0"
          dur="3s"
          fill="freeze"
        />

        <g
          v-for="(slot, i) in outerSlots"
          :key="`outer-${i}`"
          :transform="`rotate(${slot.angle}) translate(0,-66)`"
        >
          <g class="blood-cast__glyph" :style="delayStyle(i, 0)">
            <path
              :d="runeShapes[i % runeShapes.length]"
              :stroke="castColor"
              filter="url(#rune-glow)"
              fill="none"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>
        </g>
      </g>

      <!-- Внутреннее кольцо: встречное вращение -->
      <g class="blood-cast__orbit-group">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 0 0"
          to="-460 0 0"
          dur="3s"
          fill="freeze"
        />

        <g
          v-for="(slot, i) in innerSlots"
          :key="`inner-${i}`"
          :transform="`rotate(${slot.angle}) translate(0,-43)`"
        >
          <g
            class="blood-cast__glyph blood-cast__glyph--inner"
            :style="delayStyle(i, outerSlots.length)"
          >
            <path
              :d="runeShapes[(i + 2) % runeShapes.length]"
              :stroke="castColor"
              filter="url(#rune-glow)"
              fill="none"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>
        </g>
      </g>
    </svg>

    <div class="blood-cast__singularity" :style="singularityStyle">
      <div class="blood-cast__core" />
      <div class="blood-cast__halo blood-cast__halo--outer" />
      <div class="blood-cast__halo blood-cast__halo--inner" />
    </div>
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  const store = useGameStore()
  const CAST_DURATION_MS = 3000

  const outerSlots = Array.from({ length: 8 }, (_, i) => ({ angle: (i * 360) / 8 }))
  const innerSlots = Array.from({ length: 5 }, (_, i) => ({ angle: 18 + (i * 360) / 5 }))

  // Руны нарисованы штрихами, чтобы не зависеть от поддержки unicode-шрифтов.
  const runeShapes = [
    'M0 -9 V9 M0 -2 L7 -9 M0 2 L7 9',
    'M-7 -9 H7 L-5 0 H7 L-7 9',
    'M-6 -9 V9 M-6 0 H7 M-6 -9 L7 9',
    'M-7 -9 L7 -9 L7 9 M-7 9 H7 M0 -9 V9',
    'M-7 -9 V9 M-7 -9 L7 0 L-7 9 M7 -9 V9',
    'M-7 -9 L7 -9 M0 -9 V9 M-7 9 H7',
  ]

  function delayStyle(index, offset) {
    const runeStepMs = 180
    const delayMs = (offset + index) * runeStepMs
    return {
      '--rune-delay': `${delayMs}ms`,
    }
  }

  const cast = computed(() => {
    const v = store.abilityVfx
    return v?.type === 'bloodCast' ? v : null
  })

  const castColor = computed(() => cast.value?.color ?? '#dc2626')

  const singularityStyle = computed(() => ({
    '--blood-cast-color': castColor.value,
  }))

  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  const posStyle = computed(() => {
    if (!cast.value) return {}
    const size = hc.value * 4.2
    const cx = cast.value.col * hc.value + ox.value + hc.value
    const cy = cast.value.row * hc.value + oy.value + hc.value
    return {
      left: `${cx}px`,
      top: `${cy}px`,
      width: `${size}px`,
      height: `${size}px`,
    }
  })

  watch(cast, (v) => {
    if (!v) return
    setTimeout(() => {
      if (store.abilityVfx?.type === 'bloodCast') store.abilityVfx = null
    }, CAST_DURATION_MS)
  })
</script>

<style lang="scss" scoped>
  .blood-cast {
    position: absolute;
    z-index: 7;
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  .blood-cast__svg {
    width: 100%;
    height: 100%;
    transform-origin: center;
    filter: drop-shadow(0 0 9px rgb(220 38 38 / 85%));
    animation: cast-cycle 3s cubic-bezier(0.22, 0.06, 0.32, 1) forwards;
  }

  .blood-cast__ring {
    fill: none;
    stroke-width: 1.8;
    opacity: 0.22;
    stroke-dasharray: 8 6;
  }

  .blood-cast__ring--inner {
    opacity: 0.3;
    stroke-dasharray: 7 5;
  }

  .blood-cast__glyph {
    opacity: 0;
    transform-box: fill-box;
    transform-origin: center;
    animation: rune-materialize 0.45s ease-out var(--rune-delay) forwards;
  }

  .blood-cast__glyph--inner {
    animation-duration: 0.52s;
  }

  .blood-cast__orbit-group {
    transform-origin: 0 0;
  }

  .blood-cast__glyph path {
    vector-effect: non-scaling-stroke;
    animation: rune-flicker 0.16s ease-in-out infinite alternate;
  }

  .blood-cast__singularity {
    position: absolute;
    inset: 50%;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .blood-cast__core,
  .blood-cast__halo {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    opacity: 0;
  }

  .blood-cast__core {
    width: 18px;
    height: 18px;
    background:
      radial-gradient(
        circle,
        rgb(255 242 242 / 98%) 0%,
        rgb(255 166 166 / 88%) 24%,
        transparent 58%
      ),
      conic-gradient(
        from 0deg,
        rgb(127 29 29 / 0%) 0deg,
        var(--blood-cast-color, #dc2626) 110deg,
        rgb(127 29 29 / 0%) 205deg,
        rgb(248 113 113 / 88%) 300deg,
        rgb(127 29 29 / 0%) 360deg
      );
    box-shadow:
      0 0 12px 2px rgb(220 38 38 / 88%),
      0 0 28px 10px rgb(127 29 29 / 42%);
    animation: singularity-core 3s ease-out forwards;
  }

  .blood-cast__halo {
    border: 2px solid var(--blood-cast-color, #dc2626);
    box-shadow: 0 0 12px rgb(220 38 38 / 55%);
  }

  .blood-cast__halo--outer {
    width: 26px;
    height: 26px;
    animation: singularity-halo-outer 3s ease-out forwards;
  }

  .blood-cast__halo--inner {
    width: 14px;
    height: 14px;
    border-width: 1px;
    animation: singularity-halo-inner 3s ease-out forwards;
  }

  // Визуальный образ: медленное нарастание силы, затем резкий "выдох" в центр.
  @keyframes cast-cycle {
    0% {
      opacity: 0;
      transform: scale(0.42);
    }

    22% {
      opacity: 1;
      transform: scale(0.86);
    }

    78% {
      opacity: 1;
      transform: scale(1.24);
    }

    90% {
      opacity: 1;
      transform: scale(1.3);
    }

    96% {
      opacity: 0.95;
      transform: scale(0.62);
    }

    100% {
      opacity: 0;
      transform: scale(0.04);
    }
  }

  @keyframes rune-materialize {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }

    65% {
      opacity: 1;
      transform: scale(1.12);
    }

    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes rune-flicker {
    from {
      opacity: 0.68;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes singularity-core {
    0%,
    84% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.08);
    }

    92% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(0.95) rotate(150deg);
    }

    97% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.08) rotate(340deg);
    }

    99% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(0.86) rotate(392deg);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.08) rotate(420deg);
    }
  }

  @keyframes singularity-halo-outer {
    0%,
    86% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.12);
    }

    95% {
      opacity: 0.78;
      transform: translate(-50%, -50%) scale(1.7);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.34);
    }
  }

  @keyframes singularity-halo-inner {
    0%,
    88% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.08);
    }

    94% {
      opacity: 0.92;
      transform: translate(-50%, -50%) scale(1.18);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.24);
    }
  }
</style>

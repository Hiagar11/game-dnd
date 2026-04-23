<template>
  <!--
    Быстрый шаг — синяя пульсирующая волна вокруг кастера.
    Запускается через store.abilityVfx = { type: 'quickStep', col, row }
  -->
  <div v-if="vfx" class="quick-step" :style="posStyle">
    <!-- Центральная вспышка-пульс -->
    <div class="quick-step__pulse" />

    <!-- Первое расходящееся кольцо -->
    <div class="quick-step__ring quick-step__ring--outer" />

    <!-- Второе кольцо с задержкой -->
    <div class="quick-step__ring quick-step__ring--inner" />
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  import { playQuickStep } from '../composables/useSound'

  const store = useGameStore()

  const vfx = computed(() => {
    const v = store.abilityVfx
    return v?.type === 'quickStep' ? v : null
  })

  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  // Позиция: центрируем контейнер на токене (4× halfCell)
  const posStyle = computed(() => {
    if (!vfx.value) return {}
    const size = hc.value * 4
    const cx = vfx.value.col * hc.value + ox.value + hc.value
    const cy = vfx.value.row * hc.value + oy.value + hc.value
    return {
      left: `${cx - size / 2}px`,
      top: `${cy - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    }
  })

  // Звук + автоочистка через 700 мс
  watch(vfx, (v) => {
    if (v) {
      playQuickStep()
      setTimeout(() => {
        store.abilityVfx = null
      }, 700)
    }
  })
</script>

<style lang="scss" scoped>
  .quick-step {
    position: absolute;
    z-index: 6;
    pointer-events: none;
  }

  // ── Центральный пульс ────────────────────────────────────────────
  .quick-step__pulse {
    position: absolute;
    inset: 30%;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(255 255 255 / 90%) 0%, #3b82f6 45%, transparent 75%);
    animation: qs-pulse 0.5s ease-out forwards;
  }

  @keyframes qs-pulse {
    0% {
      transform: scale(0.4);
      opacity: 1;
    }

    50% {
      transform: scale(1.3);
      opacity: 0.9;
    }

    100% {
      transform: scale(0.85);
      opacity: 0;
    }
  }

  // ── Расходящееся кольцо ─────────────────────────────────────────
  .quick-step__ring {
    position: absolute;
    inset: 10%;
    border: 2px solid #3b82f6;
    border-radius: 50%;
    box-shadow:
      0 0 8px 3px #3b82f6,
      inset 0 0 6px 1px rgb(59 130 246 / 30%);
    animation: qs-ring 0.65s ease-out forwards;
  }

  @keyframes qs-ring {
    0% {
      transform: scale(0.3);
      opacity: 1;
    }

    60% {
      transform: scale(1.5);
      opacity: 0.5;
    }

    100% {
      transform: scale(2.2);
      opacity: 0;
    }
  }

  // Второе кольцо чуть меньше и с задержкой
  .quick-step__ring--inner {
    inset: 20%;
    border-color: #93c5fd;
    box-shadow: 0 0 6px 2px #93c5fd;
    animation-delay: 0.1s;
    animation-duration: 0.55s;
  }
</style>

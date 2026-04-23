<template>
  <!--
    Попадание кровавой магии: чистая вспышка-схлопывание без разлива.
    Запускается через store.abilityVfx = { type: 'bloodImpact', col, row, color }
  -->
  <div v-if="impact" class="blood-impact" :style="posStyle">
    <!-- Шокволна вокруг токена — быстрое красное кольцо, обозначающее урон -->
    <div class="blood-impact__shockwave" :style="impactStyle" />
    <div class="blood-impact__flash" :style="impactStyle" />
    <div class="blood-impact__ring blood-impact__ring--outer" :style="impactStyle" />
    <div class="blood-impact__ring blood-impact__ring--inner" :style="impactStyle" />
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  import { playBloodImpact } from '../composables/useSound'

  const store = useGameStore()

  const impact = computed(() => {
    const v = store.abilityVfx
    return v?.type === 'bloodImpact' ? v : null
  })

  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  const posStyle = computed(() => {
    if (!impact.value) return {}
    const size = hc.value * 3.2
    const cx = impact.value.col * hc.value + ox.value + hc.value
    const cy = impact.value.row * hc.value + oy.value + hc.value
    return {
      left: `${cx - size / 2}px`,
      top: `${cy - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    }
  })

  const impactStyle = computed(() => ({
    '--blood-impact': impact.value?.color ?? '#dc2626',
  }))

  watch(impact, (v) => {
    if (!v) return
    playBloodImpact()
    setTimeout(() => {
      if (store.abilityVfx?.type === 'bloodImpact') store.abilityVfx = null
    }, 760)
  })
</script>

<style lang="scss" scoped>
  .blood-impact {
    position: absolute;
    z-index: 7;
    pointer-events: none;
  }

  .blood-impact__flash {
    position: absolute;
    inset: 24%;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgb(255 242 242 / 100%) 0%,
      rgb(255 185 185 / 90%) 24%,
      var(--blood-impact, #dc2626) 56%,
      transparent 84%
    );
    box-shadow:
      0 0 16px 4px rgb(220 38 38 / 70%),
      0 0 32px 10px rgb(127 29 29 / 24%);
    animation: blood-flash 0.48s ease-out forwards;
  }

  .blood-impact__ring {
    position: absolute;
    border-radius: 50%;
    border: 2px solid var(--blood-impact, #dc2626);
    box-shadow: 0 0 14px 4px rgb(220 38 38 / 60%);
  }

  .blood-impact__ring--outer {
    inset: 8%;
    animation: blood-ring-outer 0.52s ease-out forwards;
  }

  .blood-impact__ring--inner {
    inset: 20%;
    border-width: 1px;
    animation: blood-ring-inner 0.44s ease-out forwards;
  }

  /* Шокволна — расширяется от токена наружу быстрым кольцом */
  .blood-impact__shockwave {
    position: absolute;
    inset: 20%;
    border-radius: 50%;
    border: 3px solid var(--blood-impact, #dc2626);
    box-shadow:
      0 0 18px 6px rgb(220 38 38 / 80%),
      inset 0 0 12px 2px rgb(220 38 38 / 40%);
    animation: blood-shockwave 0.42s ease-out forwards;
  }

  @keyframes blood-shockwave {
    0% {
      transform: scale(0.3);
      opacity: 1;
    }

    60% {
      opacity: 0.9;
    }

    100% {
      transform: scale(2.6);
      opacity: 0;
    }
  }

  @keyframes blood-flash {
    0% {
      transform: scale(0.18);
      opacity: 0;
    }

    34% {
      transform: scale(1.05);
      opacity: 1;
    }

    100% {
      transform: scale(0.42);
      opacity: 0;
    }
  }

  @keyframes blood-ring-outer {
    0% {
      transform: scale(0.24);
      opacity: 0;
    }

    100% {
      transform: scale(1.35);
      opacity: 0;
    }
  }

  @keyframes blood-ring-inner {
    0% {
      transform: scale(0.2);
      opacity: 0;
    }

    40% {
      transform: scale(0.82);
      opacity: 0.9;
    }

    100% {
      transform: scale(1.05);
      opacity: 0;
    }
  }
</style>

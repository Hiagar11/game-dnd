<template>
  <!--
    Анимация удара AoE-способности — цветные вспышки на ячейках.
    Показывается 0.8 с, затем исчезает и сбрасывает store.abilityImpact.
  -->
  <div v-if="impact" class="ability-impact-layer">
    <div
      v-for="(cell, i) in impact.cells"
      :key="i"
      class="ability-impact-cell"
      :style="cellStyle(cell)"
    />
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'

  const store = useGameStore()
  const impact = computed(() => store.abilityImpact)

  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  function cellStyle(cell) {
    const color = impact.value?.color ?? '#f97316'
    return {
      left: `${cell.col * hc.value + ox.value}px`,
      top: `${cell.row * hc.value + oy.value}px`,
      width: `${hc.value}px`,
      height: `${hc.value}px`,
      '--impact-color': color,
    }
  }

  // Через 800 мс убираем impact и оповещаем родителя
  watch(impact, (v) => {
    if (v) {
      setTimeout(() => {
        store.abilityImpact = null
      }, 800)
    }
  })
</script>

<style lang="scss" scoped>
  .ability-impact-layer {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
  }

  .ability-impact-cell {
    position: absolute;
    border-radius: 2px;
    animation: impact-burn 0.8s ease-out forwards;
    background: radial-gradient(circle, var(--impact-color) 0%, transparent 70%);
    opacity: 0;
  }

  @keyframes impact-burn {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }

    20% {
      opacity: 0.85;
      transform: scale(1.15);
    }

    60% {
      opacity: 0.6;
      transform: scale(1);
    }

    100% {
      opacity: 0;
      transform: scale(0.9);
    }
  }
</style>

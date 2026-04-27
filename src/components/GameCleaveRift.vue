<template>
  <!--
    Раскол: фаза вонзания меча в точке кастера, затем трещины по выбранным клеткам.
    Запускается через store.abilityVfx = { type: 'cleaveRift', col, row, cells, color, crackDelayMs }
  -->
  <div v-if="rift" class="cleave-rift-layer">
    <div class="cleave-rift__stab" :style="stabStyle" />

    <div
      v-for="(cell, idx) in crackCells"
      :key="`${cell.col},${cell.row},${idx}`"
      class="cleave-rift__cell"
      :style="cellStyle(cell, idx)"
    >
      <div class="cleave-rift__fracture" :style="fractureStyle(idx)" />
    </div>
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'

  const store = useGameStore()

  const rift = computed(() => {
    const vfx = store.abilityVfx
    return vfx?.type === 'cleaveRift' ? vfx : null
  })

  const crackCells = computed(() => rift.value?.cells ?? [])

  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  const crackDelayMs = computed(() => rift.value?.crackDelayMs ?? 440)

  const stabStyle = computed(() => {
    if (!rift.value) return {}

    const size = hc.value * 2.4
    const cx = rift.value.col * hc.value + ox.value + hc.value
    const cy = rift.value.row * hc.value + oy.value + hc.value

    return {
      left: `${cx - size / 2}px`,
      top: `${cy - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      '--cleave-color': rift.value.color ?? '#ef4444',
      '--cleave-crack-delay': `${crackDelayMs.value}ms`,
    }
  })

  function cellStyle(cell, idx) {
    return {
      left: `${cell.col * hc.value + ox.value}px`,
      top: `${cell.row * hc.value + oy.value}px`,
      width: `${hc.value * 2}px`,
      height: `${hc.value * 2}px`,
      '--cleave-color': rift.value?.color ?? '#ef4444',
      '--cleave-crack-delay': `${crackDelayMs.value + idx * 28}ms`,
    }
  }

  function fractureStyle(idx) {
    return {
      '--fracture-rot': `${idx % 2 === 0 ? -14 : 12}deg`,
    }
  }

  watch(rift, (v) => {
    if (!v) return

    const totalMs = crackDelayMs.value + 560
    setTimeout(() => {
      if (store.abilityVfx?.type === 'cleaveRift') store.abilityVfx = null
    }, totalMs)
  })
</script>

<style lang="scss" scoped>
  .cleave-rift-layer {
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none;
  }

  .cleave-rift__stab {
    position: absolute;
    border-radius: 50%;
    background:
      radial-gradient(
        circle at 50% 60%,
        rgb(255 241 221 / 90%) 0%,
        rgb(176 38 16 / 85%) 35%,
        transparent 78%
      ),
      radial-gradient(circle at 50% 50%, rgb(239 68 68 / 40%) 0%, transparent 68%);
    box-shadow:
      0 0 20px 6px rgb(127 29 29 / 55%),
      inset 0 0 14px 3px rgb(254 202 202 / 30%);
    animation: cleave-stab 0.36s ease-out forwards;
  }

  .cleave-rift__stab::after {
    content: '';
    position: absolute;
    left: 49%;
    top: 8%;
    width: 3px;
    height: 84%;
    background: linear-gradient(
      to bottom,
      rgb(255 255 255 / 94%) 0%,
      var(--cleave-color, #ef4444) 38%,
      transparent 100%
    );
    transform: translateX(-50%);
    border-radius: 3px;
    opacity: 0;
    animation:
      cleave-sword-line 0.24s ease-out 0.04s forwards,
      cleave-sword-fade 0.2s ease-in 0.3s forwards;
  }

  .cleave-rift__cell {
    position: absolute;
    overflow: hidden;
    border-radius: 4px;
  }

  .cleave-rift__fracture {
    position: absolute;
    inset: 6%;
    border-radius: 4px;
    opacity: 0;
    transform: scale(0.7) rotate(var(--fracture-rot, 0deg));
    background:
      linear-gradient(135deg, transparent 10%, rgb(17 24 39 / 88%) 44%, transparent 50%),
      linear-gradient(48deg, transparent 28%, rgb(127 29 29 / 84%) 50%, transparent 65%),
      radial-gradient(circle, rgb(248 113 113 / 44%) 0%, transparent 72%);
    box-shadow:
      0 0 18px 2px rgb(127 29 29 / 38%),
      inset 0 0 14px 2px rgb(239 68 68 / 24%);
    animation: cleave-crack 0.5s ease-out var(--cleave-crack-delay) forwards;
  }

  @keyframes cleave-stab {
    0% {
      transform: scale(0.35);
      opacity: 0;
    }

    45% {
      transform: scale(1.08);
      opacity: 0.95;
    }

    100% {
      transform: scale(1);
      opacity: 0;
    }
  }

  @keyframes cleave-sword-line {
    0% {
      opacity: 0;
      transform: translateX(-50%) scaleY(0.2);
    }

    100% {
      opacity: 0.9;
      transform: translateX(-50%) scaleY(1);
    }
  }

  @keyframes cleave-sword-fade {
    0% {
      opacity: 0.9;
    }

    100% {
      opacity: 0;
    }
  }

  @keyframes cleave-crack {
    0% {
      opacity: 0;
      transform: scale(0.7) rotate(var(--fracture-rot, 0deg));
    }

    40% {
      opacity: 0.95;
      transform: scale(1.05) rotate(var(--fracture-rot, 0deg));
    }

    100% {
      opacity: 0;
      transform: scale(1) rotate(var(--fracture-rot, 0deg));
    }
  }
</style>

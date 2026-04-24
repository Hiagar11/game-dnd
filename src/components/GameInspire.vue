<template>
  <!--
    Воодушевление — жёлтая волна снизу вверх на союзнике.
    Запускается через store.abilityVfx = { type: 'inspire', col, row }
  -->
  <div v-if="vfx" class="inspire-vfx" :style="posStyle">
    <!-- Жёлтая волна, поднимающаяся снизу вверх -->
    <div class="inspire-vfx__wave" />

    <!-- Светящийся контур вокруг токена -->
    <div class="inspire-vfx__glow" />

    <!-- Разлетающиеся частицы-искры -->
    <div class="inspire-vfx__spark inspire-vfx__spark--a" />
    <div class="inspire-vfx__spark inspire-vfx__spark--b" />
    <div class="inspire-vfx__spark inspire-vfx__spark--c" />
    <div class="inspire-vfx__spark inspire-vfx__spark--d" />
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  import { playInspire } from '../composables/useSound'

  const store = useGameStore()

  const vfx = computed(() => {
    const v = store.abilityVfx
    return v?.type === 'inspire' ? v : null
  })

  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  // Контейнер размером с токен, выровненный по его позиции
  const posStyle = computed(() => {
    if (!vfx.value) return {}
    const size = hc.value * 2
    const left = vfx.value.col * hc.value + ox.value
    const top = vfx.value.row * hc.value + oy.value
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${size}px`,
      height: `${size}px`,
    }
  })

  // Звук + автоочистка через 900 мс
  watch(vfx, (v) => {
    if (v) {
      playInspire()
      setTimeout(() => {
        if (store.abilityVfx?.type === 'inspire') store.abilityVfx = null
      }, 900)
    }
  })
</script>

<style lang="scss" scoped>
  .inspire-vfx {
    position: absolute;
    z-index: 6;
    pointer-events: none;
    overflow: hidden;
    border-radius: 4px;
  }

  // ── Волна снизу вверх ───────────────────────────────────────────
  .inspire-vfx__wave {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgb(234 179 8 / 70%) 0%,
      rgb(253 224 71 / 55%) 35%,
      rgb(253 224 71 / 30%) 65%,
      transparent 100%
    );
    animation: inspire-wave 0.85s ease-out forwards;
    transform-origin: bottom center;
  }

  @keyframes inspire-wave {
    0% {
      transform: scaleY(0);
      opacity: 0.9;
    }

    35% {
      transform: scaleY(1);
      opacity: 0.85;
    }

    70% {
      transform: scaleY(1);
      opacity: 0.5;
    }

    100% {
      transform: scaleY(1);
      opacity: 0;
    }
  }

  // ── Светящийся контур ───────────────────────────────────────────
  .inspire-vfx__glow {
    position: absolute;
    inset: -3px;
    border: 2px solid #eab308;
    border-radius: 5px;
    box-shadow:
      0 0 14px 5px rgb(234 179 8 / 65%),
      inset 0 0 10px 2px rgb(253 224 71 / 25%);
    animation: inspire-glow 0.85s ease-out forwards;
  }

  @keyframes inspire-glow {
    0% {
      opacity: 0;
      transform: scale(0.85);
    }

    25% {
      opacity: 1;
      transform: scale(1.04);
    }

    65% {
      opacity: 0.8;
      transform: scale(1);
    }

    100% {
      opacity: 0;
      transform: scale(1);
    }
  }

  // ── Искры ────────────────────────────────────────────────────────
  .inspire-vfx__spark {
    position: absolute;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #fde047;
    box-shadow: 0 0 6px 2px rgb(234 179 8 / 80%);
    animation: inspire-spark 0.7s ease-out forwards;
  }

  .inspire-vfx__spark--a {
    top: 35%;
    left: 10%;
    animation-delay: 0.1s;

    --tx: -18px;
    --ty: -22px;
  }

  .inspire-vfx__spark--b {
    top: 25%;
    left: 75%;
    animation-delay: 0.15s;

    --tx: 16px;
    --ty: -28px;
  }

  .inspire-vfx__spark--c {
    top: 55%;
    left: 20%;
    animation-delay: 0.05s;

    --tx: -14px;
    --ty: -18px;
  }

  .inspire-vfx__spark--d {
    top: 45%;
    left: 70%;
    animation-delay: 0.2s;

    --tx: 20px;
    --ty: -20px;
  }

  @keyframes inspire-spark {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }

    100% {
      transform: translate(var(--tx), var(--ty)) scale(0);
      opacity: 0;
    }
  }
</style>

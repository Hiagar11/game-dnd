<template>
  <div v-if="vfx" class="grav-crush" :style="posStyle" aria-hidden="true">
    <!-- 1. Вспышка по зоне — мгновенный удар (0–350ms) -->
    <div class="grav-crush__flash" />

    <!-- 2. Ударные волны расходятся наружу (0–450ms / 80–700ms) -->
    <div class="grav-crush__shockwave grav-crush__shockwave--fast" />
    <div class="grav-crush__shockwave grav-crush__shockwave--slow" />

    <!-- 3. Кольца сжимаются к центру с ускорением (350–1800ms) -->
    <div class="grav-crush__ring grav-crush__ring--outer" />
    <div class="grav-crush__ring grav-crush__ring--mid" />
    <div class="grav-crush__ring grav-crush__ring--inner" />

    <!-- 4. Линии гравитационного поля (400–1600ms) -->
    <svg class="grav-crush__field" viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg">
      <line
        v-for="(l, i) in fieldLines"
        :key="i"
        :x1="l.x1"
        :y1="l.y1"
        x2="0"
        y2="0"
        stroke="#c084fc"
        stroke-width="1.2"
        stroke-linecap="round"
        opacity="0.65"
      />
    </svg>

    <!-- 5. Сингулярность — точка нарастает и схлопывается (500–2000ms) -->
    <div class="grav-crush__core" />

    <!-- 6. Второй пик — яркая вспышка на 1100ms -->
    <div class="grav-crush__peak" />
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'

  const store = useGameStore()

  const VFX_MS = 2200

  const vfx = computed(() => {
    const v = store.abilityVfx
    return v?.type === 'gravity_crush' ? v : null
  })

  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  // Контейнер 3×cellSize, центрирован над зоной 2×2 (col/row = центр зоны)
  const posStyle = computed(() => {
    if (!vfx.value) return {}
    const size = store.cellSize * 3
    const cx = vfx.value.col * hc.value + ox.value
    const cy = vfx.value.row * hc.value + oy.value
    return {
      left: `${cx - size / 2}px`,
      top: `${cy - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    }
  })

  // 8 линий гравитационного поля, равномерно по кругу
  const fieldLines = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 8
    return { x1: Math.cos(angle) * 88, y1: Math.sin(angle) * 88 }
  })

  watch(vfx, (v) => {
    if (v) {
      setTimeout(() => {
        if (store.abilityVfx?.type === 'gravity_crush') store.abilityVfx = null
      }, VFX_MS)
    }
  })
</script>

<style lang="scss" scoped>
  .grav-crush {
    position: absolute;
    z-index: 6;
    pointer-events: none;
    overflow: visible;
  }

  /* ── Вспомогательный mixin для центрирования ──────────────── */
  %centered {
    position: absolute;
    left: 50%;
    top: 50%;
  }

  /* ── 1. Вспышка по зоне ─────────────────────────────────────
     Зона = 2/3 контейнера. Мгновенный резкий удар, быстрое затухание. */
  .grav-crush__flash {
    @extend %centered;

    width: 67%;
    height: 67%;
    border-radius: 10px;
    background: radial-gradient(
      ellipse,
      rgb(255 255 255 / 88%) 0%,
      rgb(216 180 254 / 75%) 28%,
      rgb(139 92 246 / 50%) 55%,
      transparent 80%
    );
    animation: grav-flash 0.45s ease-out forwards;
  }

  @keyframes grav-flash {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.1);
    }

    6% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.06);
    }

    22% {
      opacity: 0.75;
      transform: translate(-50%, -50%) scale(1);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  /* ── 2. Ударные волны ───────────────────────────────────────
     Первое кольцо — стремительный разлёт (< 500ms).
     Второе — медленнее, как затухающее эхо. */
  .grav-crush__shockwave {
    @extend %centered;

    border-radius: 50%;
    border-style: solid;
    transform: translate(-50%, -50%) scale(0.05);
  }

  .grav-crush__shockwave--fast {
    width: 100%;
    height: 100%;
    border-width: 2px;
    border-color: rgb(216 180 254 / 90%);
    box-shadow: 0 0 8px 2px rgb(139 92 246 / 50%);
    animation: grav-shock-fast 0.45s cubic-bezier(0.15, 0, 0.7, 1) forwards;
  }

  .grav-crush__shockwave--slow {
    width: 80%;
    height: 80%;
    border-width: 1.5px;
    border-color: rgb(139 92 246 / 65%);
    animation: grav-shock-slow 0.65s cubic-bezier(0.2, 0, 0.6, 1) 0.08s forwards;
  }

  @keyframes grav-shock-fast {
    0% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(0.05);
    }

    65% {
      opacity: 0.55;
      transform: translate(-50%, -50%) scale(1.15);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.4);
    }
  }

  @keyframes grav-shock-slow {
    0% {
      opacity: 0.85;
      transform: translate(-50%, -50%) scale(0.1);
    }

    55% {
      opacity: 0.4;
      transform: translate(-50%, -50%) scale(1);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.2);
    }
  }

  /* ── 3. Кольца сжимаются к центру ──────────────────────────
     Медленный старт, нарастающее ускорение — как реальная гравитация.
     Затем схлопываются в точку.
     Задержки: outer 350ms, mid 450ms, inner 550ms */
  .grav-crush__ring {
    @extend %centered;

    border-radius: 50%;
    border-style: solid;
  }

  .grav-crush__ring--outer {
    width: 92%;
    height: 92%;
    border-width: 1.5px;
    border-color: rgb(167 139 250 / 75%);
    animation: grav-ring-contract 1.45s cubic-bezier(0.35, 0, 0.95, 0.85) 0.35s forwards;
    opacity: 0;
  }

  .grav-crush__ring--mid {
    width: 65%;
    height: 65%;
    border-width: 1.5px;
    border-color: rgb(139 92 246 / 70%);
    animation: grav-ring-contract 1.25s cubic-bezier(0.35, 0, 0.95, 0.85) 0.45s forwards;
    opacity: 0;
  }

  .grav-crush__ring--inner {
    width: 40%;
    height: 40%;
    border-width: 2px;
    border-color: rgb(216 180 254 / 85%);
    box-shadow: 0 0 6px 1px rgb(139 92 246 / 40%);
    animation: grav-ring-contract 1.05s cubic-bezier(0.35, 0, 0.95, 0.85) 0.55s forwards;
    opacity: 0;
  }

  @keyframes grav-ring-contract {
    0% {
      opacity: 0.9;
      transform: translate(-50%, -50%) scale(1);
    }

    35% {
      opacity: 0.8;
      transform: translate(-50%, -50%) scale(0.65);
    }

    72% {
      opacity: 0.85;
      transform: translate(-50%, -50%) scale(0.18);
    }

    90% {
      opacity: 0.6;
      transform: translate(-50%, -50%) scale(0.05);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.02);
    }
  }

  /* ── 4. Линии гравитационного поля ─────────────────────────
     Появляются когда резонанс нарастает, схлопываются вместе с кольцами. */
  .grav-crush__field {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    animation: grav-field 1.6s ease-in-out 0.4s forwards;
    opacity: 0;
  }

  @keyframes grav-field {
    0% {
      opacity: 0;
      transform: scale(1) rotate(0deg);
    }

    18% {
      opacity: 0.7;
      transform: scale(1) rotate(8deg);
    }

    65% {
      opacity: 0.55;
      transform: scale(0.28) rotate(32deg);
    }

    90% {
      opacity: 0.2;
      transform: scale(0.06) rotate(48deg);
    }

    100% {
      opacity: 0;
      transform: scale(0.02) rotate(55deg);
    }
  }

  /* ── 5. Сингулярность — нарастает, пульсирует, схлопывается ─ */
  .grav-crush__core {
    @extend %centered;

    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgb(255 255 255 / 100%) 0%,
      rgb(240 171 252 / 92%) 25%,
      rgb(139 92 246 / 75%) 55%,
      transparent 80%
    );
    box-shadow:
      0 0 14px 4px rgb(139 92 246 / 85%),
      0 0 30px 12px rgb(76 29 149 / 45%);
    animation: grav-core 2s ease-out 0.5s forwards;
    opacity: 0;
  }

  @keyframes grav-core {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.05);
    }

    20% {
      opacity: 0.7;
      transform: translate(-50%, -50%) scale(0.55);
    }

    42% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }

    /* Пик на ~1000ms от старта — где звук громче */
    55% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.45);
    }

    68% {
      opacity: 0.9;
      transform: translate(-50%, -50%) scale(1.2);
    }

    85% {
      opacity: 0.5;
      transform: translate(-50%, -50%) scale(0.7);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.1);
    }
  }

  /* ── 6. Второй пик — обертон на ~1100ms ────────────────────
     Быстрая вспышка, яркий импульс. */
  .grav-crush__peak {
    @extend %centered;

    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgb(255 255 255 / 96%) 0%,
      rgb(216 180 254 / 70%) 35%,
      transparent 70%
    );
    box-shadow: 0 0 20px 8px rgb(167 139 250 / 65%);
    animation: grav-peak 0.45s ease-out 1.1s forwards;
    opacity: 0;
  }

  @keyframes grav-peak {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.15);
    }

    28% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }

    60% {
      opacity: 0.75;
      transform: translate(-50%, -50%) scale(1.35);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.6);
    }
  }
</style>

<template>
  <!--
    Удар щитом — желтоватая расширяющаяся вспышка (оглушение).
    Запускается через store.abilityVfx = { type: 'bash', col, row, color }
  -->
  <div v-if="bash" class="shield-bash" :style="posStyle">
    <!-- Центральная вспышка -->
    <div class="shield-bash__flash" :style="{ '--bash-color': bash.color }" />

    <!-- Расходящееся кольцо ударной волны -->
    <div class="shield-bash__ring" :style="{ '--bash-color': bash.color }" />

    <!-- Радиальные лучи -->
    <div class="shield-bash__ray shield-bash__ray--1" />
    <div class="shield-bash__ray shield-bash__ray--2" />
    <div class="shield-bash__ray shield-bash__ray--3" />
    <div class="shield-bash__ray shield-bash__ray--4" />
    <div class="shield-bash__ray shield-bash__ray--5" />
    <div class="shield-bash__ray shield-bash__ray--6" />
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  import { playShieldBash } from '../composables/useSound'

  const store = useGameStore()
  const bash = computed(() => {
    const v = store.abilityVfx
    return v?.type === 'bash' ? v : null
  })

  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  // Позиция: центрируем на токене — 3× halfCell
  const posStyle = computed(() => {
    if (!bash.value) return {}
    const size = hc.value * 3
    const cx = bash.value.col * hc.value + ox.value + hc.value
    const cy = bash.value.row * hc.value + oy.value + hc.value
    return {
      left: `${cx - size / 2}px`,
      top: `${cy - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    }
  })

  // Автоочистка через 650 мс + звук
  watch(bash, (v) => {
    if (v) {
      playShieldBash()
      setTimeout(() => {
        store.abilityVfx = null
      }, 650)
    }
  })
</script>

<style lang="scss" scoped>
  /* stylelint-disable selector-class-pattern -- числовые модификаторы для VFX-лучей */
  .shield-bash {
    position: absolute;
    z-index: 6;
    pointer-events: none;
  }

  // ── Центральная вспышка ─────────────────────────────────────────
  .shield-bash__flash {
    position: absolute;
    inset: 25%;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgb(255 255 255 / 95%) 0%,
      var(--bash-color, #f59e0b) 40%,
      transparent 75%
    );
    animation: bash-flash 0.6s ease-out forwards;
  }

  @keyframes bash-flash {
    0% {
      transform: scale(0.2);
      opacity: 1;
    }

    40% {
      transform: scale(1.2);
      opacity: 0.9;
    }

    100% {
      transform: scale(1.6);
      opacity: 0;
    }
  }

  // ── Расходящееся кольцо ─────────────────────────────────────────
  .shield-bash__ring {
    position: absolute;
    inset: 10%;
    border: 3px solid var(--bash-color, #f59e0b);
    border-radius: 50%;
    box-shadow: 0 0 12px 4px var(--bash-color, #f59e0b);
    animation: bash-ring 0.65s ease-out forwards;
  }

  @keyframes bash-ring {
    0% {
      transform: scale(0.3);
      opacity: 1;
    }

    50% {
      transform: scale(1.4);
      opacity: 0.6;
    }

    100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  // ── Радиальные лучи ─────────────────────────────────────────────
  .shield-bash__ray {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 3px;
    height: 40%;
    background: linear-gradient(to top, rgb(245 158 11 / 90%), transparent);
    transform-origin: bottom center;
    border-radius: 2px;
    animation: bash-ray 0.5s ease-out forwards;
  }

  @keyframes bash-ray {
    0% {
      transform: translateX(-50%) scaleY(0);
      opacity: 1;
    }

    50% {
      transform: translateX(-50%) scaleY(1);
      opacity: 0.8;
    }

    100% {
      transform: translateX(-50%) scaleY(1.5);
      opacity: 0;
    }
  }

  .shield-bash__ray--1 {
    transform: translateX(-50%) rotate(0deg);
  }

  .shield-bash__ray--2 {
    transform: translateX(-50%) rotate(60deg);
  }

  .shield-bash__ray--3 {
    transform: translateX(-50%) rotate(120deg);
  }

  .shield-bash__ray--4 {
    transform: translateX(-50%) rotate(180deg);
  }

  .shield-bash__ray--5 {
    transform: translateX(-50%) rotate(240deg);
  }

  .shield-bash__ray--6 {
    transform: translateX(-50%) rotate(300deg);
  }
</style>

<template>
  <!--
    Эпичный разрез мечом — «рана» с тёмными краями, кровавой сердцевиной,
    ударной волной и частицами пыли. Запускается через store.meleeSlash
  -->
  <div v-if="slash" class="melee-slash" :style="posStyle">
    <!-- Ударная волна (dust ring) -->
    <div class="melee-slash__shockwave" />

    <!-- Частицы пыли -->
    <div class="melee-slash__dust melee-slash__dust--1" />
    <div class="melee-slash__dust melee-slash__dust--2" />
    <div class="melee-slash__dust melee-slash__dust--3" />
    <div class="melee-slash__dust melee-slash__dust--4" />
    <div class="melee-slash__dust melee-slash__dust--5" />
    <div class="melee-slash__dust melee-slash__dust--6" />

    <svg
      class="melee-slash__svg"
      :style="{ '--slash-color': slash.color }"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Свечение для сердцевины -->
        <filter id="slash-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Внешние тёмные края «раны» — широкие, почти чёрные -->
      <path
        class="melee-slash__wound-edge"
        d="M 90,0 Q 50,46 5,100"
        fill="none"
        stroke="#1a0000"
        stroke-width="14"
        stroke-linecap="round"
        opacity="0.7"
      />

      <!-- Средний слой — тёмно-красный -->
      <path
        class="melee-slash__wound-mid"
        d="M 90,0 Q 50,46 5,100"
        fill="none"
        stroke="#6b0000"
        stroke-width="8"
        stroke-linecap="round"
      />

      <!-- Кровавая сердцевина — яркий красный с glow -->
      <path
        class="melee-slash__wound-core"
        d="M 89,1 Q 50,47 6,99"
        fill="none"
        stroke="currentColor"
        stroke-width="4"
        stroke-linecap="round"
        filter="url(#slash-glow)"
      />

      <!-- Раскалённый белый центр — самая горячая часть -->
      <path
        class="melee-slash__wound-hot"
        d="M 88,2 Q 50,48 7,98"
        fill="none"
        stroke="#fff"
        stroke-width="1.8"
        stroke-linecap="round"
      />

      <!-- Искры-капли крови разлетаются от разреза -->
      <circle class="melee-slash__spark melee-slash__spark--1" cx="50" cy="48" r="3" />
      <circle class="melee-slash__spark melee-slash__spark--2" cx="30" cy="70" r="2.5" />
      <circle class="melee-slash__spark melee-slash__spark--3" cx="72" cy="24" r="2.5" />
      <circle class="melee-slash__spark melee-slash__spark--4" cx="60" cy="38" r="2" />
      <circle class="melee-slash__spark melee-slash__spark--5" cx="38" cy="60" r="2" />
    </svg>
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  import { playSword } from '../composables/useSound'

  const store = useGameStore()
  const slash = computed(() => store.meleeSlash)

  const hc = computed(() => store.cellSize / 2)
  const ox = computed(() => store.gridNormOX)
  const oy = computed(() => store.gridNormOY)

  // Позиция: центрируем на токене — увеличен размер (4× halfCell для эпичности)
  const posStyle = computed(() => {
    if (!slash.value) return {}
    const size = hc.value * 4
    const cx = slash.value.col * hc.value + ox.value + hc.value
    const cy = slash.value.row * hc.value + oy.value + hc.value
    return {
      left: `${cx - size / 2}px`,
      top: `${cy - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    }
  })

  // Автоочистка через 750 мс + звук удара одновременно с анимацией
  watch(slash, (v) => {
    if (v) {
      playSword()
      setTimeout(() => {
        store.meleeSlash = null
      }, 750)
    }
  })
</script>

<style lang="scss" scoped>
  /* stylelint-disable selector-class-pattern -- числовые модификаторы для VFX-частиц */
  .melee-slash {
    position: absolute;
    z-index: 6;
    pointer-events: none;
  }

  // ── SVG-контейнер ───────────────────────────────────────────────
  .melee-slash__svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    color: var(--slash-color, #ef4444);
    filter: drop-shadow(0 0 8px var(--slash-color, #ef4444))
      drop-shadow(0 0 18px var(--slash-color, #ef4444));
    animation: slash-container 0.7s ease-out forwards;
  }

  // ── Слои «раны» — рисуются снаружи внутрь ──────────────────────

  // Чёрные обожжённые края
  .melee-slash__wound-edge {
    stroke-dasharray: 160;
    stroke-dashoffset: 160;
    animation: wound-draw 0.18s ease-out forwards;
  }

  // Тёмно-красная плоть
  .melee-slash__wound-mid {
    stroke-dasharray: 160;
    stroke-dashoffset: 160;
    animation: wound-draw 0.2s 0.02s ease-out forwards;
  }

  // Кровавая сердцевина — яркая, пульсирующая
  .melee-slash__wound-core {
    stroke-dasharray: 160;
    stroke-dashoffset: 160;
    animation: wound-draw-core 0.22s 0.03s ease-out forwards;
  }

  // Раскалённый белый центр
  .melee-slash__wound-hot {
    stroke-dasharray: 160;
    stroke-dashoffset: 160;
    opacity: 0;
    animation: wound-hot 0.3s 0.04s ease-out forwards;
  }

  // ── Искры-капли крови ───────────────────────────────────────────
  .melee-slash__spark {
    fill: var(--slash-color, #ef4444);
    opacity: 0;
  }

  .melee-slash__spark--1 {
    fill: #fff;
    animation: spark-burst 0.4s 0.06s ease-out forwards;
  }

  .melee-slash__spark--2 {
    animation: spark-fly-left 0.45s 0.1s ease-out forwards;
  }

  .melee-slash__spark--3 {
    animation: spark-fly-right 0.4s 0.08s ease-out forwards;
  }

  .melee-slash__spark--4 {
    fill: #fff;
    animation: spark-fly-left 0.35s 0.12s ease-out forwards;
  }

  .melee-slash__spark--5 {
    animation: spark-fly-right 0.4s 0.14s ease-out forwards;
  }

  // ── Ударная волна (пыльное кольцо) ──────────────────────────────
  .melee-slash__shockwave {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 30%;
    height: 30%;
    border-radius: 50%;
    border: 2px solid rgb(255 200 150 / 40%);
    background: radial-gradient(circle, rgb(255 150 80 / 15%) 0%, transparent 70%);
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
    animation: shockwave-expand 0.5s 0.05s ease-out forwards;
  }

  // ── Частицы пыли ────────────────────────────────────────────────
  .melee-slash__dust {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgb(180 160 130 / 70%);
    opacity: 0;
  }

  .melee-slash__dust--1 {
    top: 55%;
    left: 40%;
    animation: dust-fly 0.5s 0.08s ease-out forwards;

    --dx: -18px;
    --dy: 14px;
  }

  .melee-slash__dust--2 {
    top: 50%;
    left: 55%;
    width: 5px;
    height: 5px;
    animation: dust-fly 0.45s 0.1s ease-out forwards;

    --dx: 16px;
    --dy: 12px;
  }

  .melee-slash__dust--3 {
    top: 45%;
    left: 45%;
    width: 4px;
    height: 4px;
    animation: dust-fly 0.55s 0.06s ease-out forwards;

    --dx: -12px;
    --dy: -16px;
  }

  .melee-slash__dust--4 {
    top: 52%;
    left: 52%;
    width: 5px;
    height: 5px;
    animation: dust-fly 0.4s 0.12s ease-out forwards;

    --dx: 20px;
    --dy: -10px;
  }

  .melee-slash__dust--5 {
    top: 48%;
    left: 48%;
    width: 3px;
    height: 3px;
    animation: dust-fly 0.5s 0.14s ease-out forwards;

    --dx: -8px;
    --dy: 20px;
  }

  .melee-slash__dust--6 {
    top: 54%;
    left: 42%;
    width: 4px;
    height: 4px;
    animation: dust-fly 0.45s 0.09s ease-out forwards;

    --dx: 14px;
    --dy: 18px;
  }

  // ── Keyframes ───────────────────────────────────────────────────

  // Контейнер SVG — появление + затухание
  @keyframes slash-container {
    0% {
      opacity: 0.95;
      transform: scale(0.8) rotate(-8deg);
    }

    12% {
      opacity: 1;
      transform: scale(1.1) rotate(0deg);
    }

    40% {
      opacity: 0.95;
      transform: scale(1) rotate(0deg);
    }

    100% {
      opacity: 0;
      transform: scale(1.02) rotate(0deg);
    }
  }

  // Прорисовка тёмных краёв и плоти
  @keyframes wound-draw {
    0% {
      stroke-dashoffset: 160;
      opacity: 0.6;
    }

    50% {
      opacity: 1;
    }

    100% {
      stroke-dashoffset: 0;
      opacity: 1;
    }
  }

  // Сердцевина — ярче, с пульсом
  @keyframes wound-draw-core {
    0% {
      stroke-dashoffset: 160;
      opacity: 0.5;
    }

    40% {
      opacity: 1;
    }

    70% {
      stroke-dashoffset: 0;
      opacity: 1;
    }

    85% {
      opacity: 0.7;
    }

    100% {
      stroke-dashoffset: 0;
      opacity: 0.9;
    }
  }

  // Белый раскалённый центр
  @keyframes wound-hot {
    0% {
      stroke-dashoffset: 160;
      opacity: 0;
    }

    30% {
      opacity: 1;
    }

    60% {
      stroke-dashoffset: 0;
      opacity: 0.9;
    }

    100% {
      stroke-dashoffset: 0;
      opacity: 0;
    }
  }

  // Искры — центральная вспышка
  @keyframes spark-burst {
    0% {
      opacity: 0;
      r: 2;
    }

    20% {
      opacity: 1;
      r: 5;
    }

    100% {
      opacity: 0;
      r: 1;
      transform: translate(4px, -4px);
    }
  }

  // Искры — разлёт влево
  @keyframes spark-fly-left {
    0% {
      opacity: 0;
      transform: translate(0, 0) scale(1);
    }

    15% {
      opacity: 1;
      transform: translate(-2px, 1px) scale(1.5);
    }

    100% {
      opacity: 0;
      transform: translate(-16px, 10px) scale(0.3);
    }
  }

  // Искры — разлёт вправо
  @keyframes spark-fly-right {
    0% {
      opacity: 0;
      transform: translate(0, 0) scale(1);
    }

    15% {
      opacity: 1;
      transform: translate(2px, -1px) scale(1.5);
    }

    100% {
      opacity: 0;
      transform: translate(14px, -12px) scale(0.3);
    }
  }

  // Ударная волна — расширяющееся кольцо пыли
  @keyframes shockwave-expand {
    0% {
      transform: translate(-50%, -50%) scale(0.3);
      opacity: 0;
    }

    15% {
      opacity: 0.6;
    }

    50% {
      opacity: 0.3;
    }

    100% {
      transform: translate(-50%, -50%) scale(3);
      opacity: 0;
    }
  }

  // Частицы пыли — разлетаются в стороны
  @keyframes dust-fly {
    0% {
      opacity: 0;
      transform: translate(0, 0) scale(1);
    }

    15% {
      opacity: 0.7;
      transform: translate(calc(var(--dx) * 0.15), calc(var(--dy) * 0.15)) scale(1.3);
    }

    100% {
      opacity: 0;
      transform: translate(var(--dx), var(--dy)) scale(0.4);
    }
  }
</style>

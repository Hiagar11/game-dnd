<template>
  <!--
    Единый SVG z-index: 4 — выше токенов (z-index: 3).
    Содержит два слоя:
      1. Полупрозрачный тёмный оверлей (55%) в посещённых-не-текущих клетках.
         45% прозрачности → токены (z:3) ВИДНЫ сквозь него (затемнены, но видны).
      2. GIF тумана только в НЕпосещённых клетках.
         Полностью непрозрачный → токены (z:3) СКРЫТЫ под ним.
    Текущие клетки (герой здесь) — оба слоя прозрачны → карта и токены полностью видны.
  -->
  <!--
    hidden=true: туман выключен у админа.
    Показываем пунктирный контур зоны видимости — «где заканчивается свет».
    Это только для информирования мастера, игроки всегда видят полный туман.
  -->
  <svg
    v-if="hidden"
    class="game-fog__boundary-svg"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    aria-hidden="true"
  >
    <path v-if="boundaryPath" :d="boundaryPath" class="game-fog__boundary" />
  </svg>

  <!-- Полный туман — только когда hidden=false -->
  <svg
    v-else
    class="game-fog__svg"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    aria-hidden="true"
  >
    <defs>
      <!--
        Фильтр размытия краёв тумана — softens border between fog and visible area.
        Регион расширен (±30%) чтобы blur не обрезался.
      -->
      <filter id="game-fog-blur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur :stdDeviation="blurRadius" />
      </filter>

      <!--
        Маска тумана: белый = туман виден (НЕпосещённые клетки),
        чёрный с blur = туман скрыт (все посещённые, включая текущие).
      -->
      <mask id="game-fog-mask" maskUnits="userSpaceOnUse">
        <rect x="0" y="0" :width="width" :height="height" fill="white" />
        <path v-if="visitedPath" :d="visitedPath" fill="black" filter="url(#game-fog-blur)" />
      </mask>

      <!--
        Маска затемнения: белый = оверлей виден (посещённые, но герой ушёл),
        чёрный = прозрачно (текущие и совсем непосещённые).
      -->
      <mask id="game-dim-mask" maskUnits="userSpaceOnUse">
        <rect x="0" y="0" :width="width" :height="height" fill="black" />
        <rect
          v-for="key in visitedNotCurrentList"
          :key="key"
          :x="getCol(key) * gameStore.cellSize"
          :y="getRow(key) * gameStore.cellSize"
          :width="gameStore.cellSize"
          :height="gameStore.cellSize"
          fill="white"
        />
      </mask>
    </defs>

    <!--
      Слой 1: полупрозрачный тёмный оверлей (55%) в посещённой зоне.
      rgba(0,0,0,0.55) — 45% пропускает свет снизу → карта и токены (z:3) видны сквозь него.
    -->
    <rect
      x="0"
      y="0"
      :width="width"
      :height="height"
      fill="rgba(0,0,0,0.55)"
      mask="url(#game-dim-mask)"
    />

    <!--
      Слой 2: GIF тумана только в НЕпосещённых клетках (поверх оверлея).
      Полностью непрозрачный → скрывает всё, включая токены (z:3).
    -->
    <image
      href="/systemImage/fog.gif"
      x="0"
      y="0"
      :width="width"
      :height="height"
      preserveAspectRatio="xMidYMid slice"
      mask="url(#game-fog-mask)"
    />
  </svg>
</template>

<script setup>
  import { computed, watch, onMounted } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useFogVisibility } from '../composables/useFogVisibility'

  defineProps({
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    hidden: { type: Boolean, default: false },
  })

  const gameStore = useGameStore()

  const {
    currentCells,
    visitedNotCurrentList,
    visitedPath,
    blurRadius,
    getCol,
    getRow,
    addVisitedCells,
    resetVisited,
  } = useFogVisibility()

  // Сбрасываем историю при каждом монтировании компонента —
  // компонент монтируется заново при переходе в другой сценарий.
  onMounted(() => {
    resetVisited()
  })

  // Пополняем историю посещений при движении героев.
  // immediate: true — сразу раскрываем стартовую область.
  watch(currentCells, (cells) => addVisitedCells(cells), { immediate: true })
  // Граница зоны видимости — пунктирный контур для режима с отключённым туманом.
  // Для каждой клетки в currentCells проверяем четыре соседа:
  //   если сосед не в currentCells — рисуем ту сторону клетки как границу.
  const boundaryPath = computed(() => {
    const cell = gameStore.cellSize
    const cells = currentCells.value
    if (cells.size === 0) return ''

    let d = ''

    for (const key of cells) {
      const col = getCol(key)
      const row = getRow(key)
      const x = col * cell
      const y = row * cell

      // Верх — если клетки нет выше
      if (!cells.has(`${col}:${row - 1}`)) d += `M${x},${y}H${x + cell}`
      // Низ — если клетки нет ниже
      if (!cells.has(`${col}:${row + 1}`)) d += `M${x},${y + cell}H${x + cell}`
      // Лево — если клетки нет слева
      if (!cells.has(`${col - 1}:${row}`)) d += `M${x},${y}V${y + cell}`
      // Право — если клетки нет справа
      if (!cells.has(`${col + 1}:${row}`)) d += `M${x + cell},${y}V${y + cell}`
    }

    return d
  })
</script>

<style scoped>
  /*
    z-index: 4 — выше токенов (--z-tokens: 3), ниже меню (--z-menu: 10).
    Единый слой: dim-оверлей (55%) + fog GIF, управляются SVG-масками.
    Токены в посещённой зоне скрыты через .game-tokens__token--fog-hidden в GameTokens.vue.
  */
  .game-fog__svg,
  .game-fog__boundary-svg {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 4;
  }

  /*
    Пунктирный контур зоны видимости — показывается когда туман отключён у админа.
    stroke-dasharray: 6 4 — штрих 6px, пробел 4px.
    Анимация «марширующих муравьёв» — dashoffset смещается по окружности.
  */
  .game-fog__boundary {
    fill: none;
    stroke: rgb(255 220 100 / 85%);
    stroke-width: 2;
    stroke-dasharray: 6 4;
    animation: fog-boundary-march 1.2s linear infinite;
    filter: drop-shadow(0 0 3px rgb(255 200 50 / 60%));
  }

  @keyframes fog-boundary-march {
    from {
      stroke-dashoffset: 0;
    }

    to {
      stroke-dashoffset: -20;
    }
  }
</style>

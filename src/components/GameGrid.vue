<script setup>
  import { useGridDraw } from '../composables/useGridDraw'

  // Принимаем размеры карты от родителя (GameView).
  // GameView узнаёт их из события @ready от GameMap.
  const props = defineProps({
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  })

  // Вся логика рисования — в composable.
  // Компонент отвечает только за разметку.
  const { canvasRef } = useGridDraw(props)
</script>

<template>
  <canvas ref="canvasRef" class="game-grid"></canvas>
</template>

<style lang="scss" scoped>
  .game-grid {
    display: block;
    position: absolute;
    top: 0;
    left: 0;

    // pointer-events: none — сетка не перехватывает клики мыши,
    // события проходят сквозь неё к карте (панорамирование продолжает работать)
    pointer-events: none;
  }
</style>

<template>
  <div
    ref="viewRef"
    class="game-view"
    @mousemove="onMouseMove"
    @contextmenu="onContextMenu"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <AppBackground src="/video/maw.gif" />

    <div
      ref="mapRef"
      class="game-view__map"
      :style="{ transform: `translate(${offsetX}px, ${offsetY}px)` }"
      @mouseup="onMouseUp"
      @mousedown="onMouseDown"
    >
      <!-- @ready — GameMap сообщает, что карта нарисована, и передаёт элемент canvas -->
      <GameMap map-src="/maps/images/picnic-day.webp" @ready="onMapReady" />
      <!-- Передаём размеры карты, чтобы GameGrid знал, насколько большой рисовать сетку -->
      <GameGrid :width="mapSize.width" :height="mapSize.height" />
      <!-- Пока нет картинки — слот пустой, слой просто невидим -->
      <GameTokens :width="mapSize.width" :height="mapSize.height" />
      <GameFog :width="mapSize.width" :height="mapSize.height">
        <!-- <img src="/systemImage/fog.gif" alt="fog" /> -->
      </GameFog>
    </div>

    <GameMenu />
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useMapPan } from '../composables/useMapPan'
  import AppBackground from '../components/AppBackground.vue'
  import GameMap from '../components/GameMap.vue'
  import GameGrid from '../components/GameGrid.vue'
  import GameFog from '../components/GameFog.vue'
  import GameTokens from '../components/GameTokens.vue'
  import GameMenu from '../components/GameMenu.vue'
  import { useTokenDrop } from '../composables/useTokenDrop'

  const viewRef = ref(null)
  const mapRef = ref(null)

  // canvasRef будет заполнен позже — когда GameMap сообщит о готовности карты.
  // useMapPan обращается к canvasRef.value только во время событий мыши,
  // а не при старте, поэтому null в начале — это нормально.
  const canvasRef = ref(null)

  const { offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = useMapPan(
    viewRef,
    canvasRef
  )

  const { onDragOver, onDrop } = useTokenDrop(offsetX, offsetY)

  // Размеры карты — нужны GameGrid, чтобы знать площадь для отрисовки сетки
  const mapSize = ref({ width: 0, height: 0 })

  // GameMap вызывает emit('ready', canvas) когда изображение нарисовано
  const onMapReady = (canvas) => {
    canvasRef.value = canvas
    mapSize.value = { width: canvas.width, height: canvas.height }

    // Задаём контейнеру точные размеры, иначе position: absolute схлопнется до 0
    mapRef.value.style.width = `${canvas.width}px`
    mapRef.value.style.height = `${canvas.height}px`
  }
</script>

<style scoped>
  .game-view {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
  }

  /* Карта лежит поверх AppBackground (z-index: var(--z-background)) */
  .game-view__map {
    position: absolute;
    top: 0;
    left: 0;
    z-index: var(--z-map);
    cursor: grab;
  }

  .game-view__map:active {
    cursor: grabbing;
  }

  .game-view__map::after {
    content: '';
    position: absolute;
    inset: calc(-1 * var(--map-border-size));
    z-index: var(--z-map-border);
    pointer-events: none;
    border: var(--map-border-size) solid transparent;
    border-image: url('/systemImage/border.jpg') var(--map-border-slice) round;
    clip-path: inset(0 round var(--map-border-radius));
  }
</style>

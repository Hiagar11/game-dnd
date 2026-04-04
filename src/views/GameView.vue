<template>
  <div ref="viewRef" class="game-view" @mousemove="onMouseMove" @contextmenu="onContextMenu">
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
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useMapPan } from '../composables/useMapPan'
  import AppBackground from '../components/AppBackground.vue'
  import GameMap from '../components/GameMap.vue'

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

  // GameMap вызывает emit('ready', canvas) когда изображение нарисовано
  const onMapReady = (canvas) => {
    canvasRef.value = canvas

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

  /* Карта лежит поверх AppVideo (z-index: -1) */
  .game-view__map {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    cursor: grab;
  }

  .game-view__map:active {
    cursor: grabbing;
  }
</style>

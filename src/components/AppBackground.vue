<template>
  <!-- Гифка: обычный <img>, браузер анимирует автоматически -->
  <img v-if="isGif" class="app-background" :src="src" :style="bgStyle" alt="" />

  <!-- Видео: autoplay, muted, loop обязательны для автовоспроизведения в браузерах -->
  <video v-else class="app-background" autoplay muted loop playsinline :style="bgStyle">
    <source :src="src" type="video/mp4" />
  </video>
</template>

<script setup>
  import { computed } from 'vue'

  const props = defineProps({
    src: { type: String, required: true },
    // Яркость: 0 — чёрный, 1 — оригинал. По умолчанию без затемнения.
    brightness: { type: Number, default: 1 },
  })

  // Определяем тип по расширению — .gif рендерим как <img>, иначе <video>
  const isGif = computed(() => props.src.toLowerCase().endsWith('.gif'))

  const bgStyle = computed(() => ({ filter: `brightness(${props.brightness})` }))
</script>

<style scoped>
  .app-background {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: -1;
  }
</style>

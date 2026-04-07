<template>
  <!-- canvas — рабочая поверхность для рисования карты -->
  <canvas ref="canvasRef" class="game-map"></canvas>
</template>

<script setup>
  import { ref, onMounted, watch } from 'vue'

  const props = defineProps({
    // Путь к изображению карты (относительно папки public/)
    mapSrc: { type: String, required: true },
  })

  // emit('ready', canvas) — когда карта нарисована, сообщаем родителю.
  // Родитель получает элемент <canvas> и узнаёт точные размеры карты.
  const emit = defineEmits(['ready'])

  const canvasRef = ref(null)

  function drawMap(src) {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.src = src

    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
      emit('ready', canvas)
    }
  }

  onMounted(() => drawMap(props.mapSrc))
  watch(
    () => props.mapSrc,
    (src) => drawMap(src)
  )
</script>

<style scoped>
  .game-map {
    display: block;
  }
</style>

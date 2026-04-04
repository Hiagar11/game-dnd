<template>
  <!-- canvas — рабочая поверхность для рисования карты -->
  <canvas ref="canvasRef" class="game-map"></canvas>
</template>

<script setup>
  import { ref, onMounted } from 'vue'

  const props = defineProps({
    // Путь к изображению карты (относительно папки public/)
    mapSrc: { type: String, required: true },
  })

  // emit('ready', canvas) — когда карта нарисована, сообщаем родителю.
  // Родитель получает элемент <canvas> и узнаёт точные размеры карты.
  const emit = defineEmits(['ready'])

  const canvasRef = ref(null)

  onMounted(() => {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.src = props.mapSrc

    img.onload = () => {
      // Задаём canvas размер по пикселям изображения, а не по CSS —
      // это гарантирует правильные пропорции без растяжки.
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      // Карта готова — отдаём canvas родителю
      emit('ready', canvas)
    }
  })
</script>

<style scoped>
  .game-map {
    display: block;
  }
</style>

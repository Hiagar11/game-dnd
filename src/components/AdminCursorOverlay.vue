<template>
  <Teleport to="body">
    <Transition name="cursor-fade">
      <!--
        Позиционируем через transform: translate() — это GPU-ускорено
        и не конфликтует с <Transition>, в отличие от left/top.

        Идея: position: fixed; top: 0; left: 0 — якорная точка в углу экрана.
        transform: translate(x * 100vw - 50%, y * 100vh - 50%) — смещаем
        элемент на долю экрана, сразу вычитая половину его размера (центрование).
      -->
      <div v-if="visible" class="admin-cursor" :style="style">
        <img v-if="iconUrl" :src="iconUrl" class="admin-cursor__icon" alt="" />
        <span v-else class="admin-cursor__default">🎲</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  import { computed } from 'vue'

  const props = defineProps({
    // Пиксель карты под курсором мастера. null = курсор вне окна.
    mapX: { type: Number, default: null },
    mapY: { type: Number, default: null },
    // Текущий сдвиг карты зрителя (из useViewerSync / useMapPan)
    offsetX: { type: Number, default: 0 },
    offsetY: { type: Number, default: 0 },
    iconUrl: { type: String, default: '' },
  })

  // Курсор виден только когда mapX/Y не null
  const visible = computed(() => props.mapX !== null && props.mapY !== null)

  // Переводим map-координаты в экранные через offset зрителя.
  // Формула: screenX = mapX + offsetX  (обратная к mapX = clientX - offsetX)
  const style = computed(() => {
    if (!visible.value) return {}
    const sx = props.mapX + props.offsetX
    const sy = props.mapY + props.offsetY
    return { transform: `translate(${sx}px, ${sy}px) translate(-50%, -50%)` }
  })
</script>

<style scoped>
  .admin-cursor {
    position: fixed;

    /* Якорная точка — левый верхний угол экрана */
    top: 0;
    left: 0;
    z-index: 9999;
    pointer-events: none;
    user-select: none;

    /*
      transition на transform — GPU-ускорен, не конфликтует с <Transition>.
      30ms = чуть меньше интервала сокета (33ms), поэтому курсор успевает
      добраться до цели до следующего обновления без накопленного лага.
    */
    transition: transform 30ms linear;
  }

  .admin-cursor__icon {
    display: block;
    width: 48px;
    height: 48px;
    object-fit: contain;
    border-radius: 50%;
    filter: drop-shadow(0 2px 6px rgb(0 0 0 / 80%));
  }

  .admin-cursor__default {
    display: block;
    font-size: 32px;
    line-height: 1;
    filter: drop-shadow(0 2px 6px rgb(0 0 0 / 80%));
  }

  /*
    Явно перечисляем оба свойства — иначе opacity-transition из enter-active
    перебил бы transform-transition из .admin-cursor (одинаковый специфицитет,
    побеждает последний объявленный).
  */
  .cursor-fade-enter-active,
  .cursor-fade-leave-active {
    transition:
      opacity 0.15s ease,
      transform 30ms linear;
  }

  .cursor-fade-enter-from,
  .cursor-fade-leave-to {
    opacity: 0;
  }
</style>

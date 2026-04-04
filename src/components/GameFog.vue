<template>
  <!--
    game-fog — третий слой карты: поверх сетки, под интерфейсом.
    Изображение тумана вставляется снаружи через <slot />.
    Пример использования в родителе:
      <GameFog :width="mapSize.width" :height="mapSize.height">
        <img src="/maps/fog/dungeon-01-fog.webp" alt="fog" />
      </GameFog>
  -->
  <div class="game-fog" :style="{ width: `${width}px`, height: `${height}px` }">
    <slot />
  </div>
</template>

<script setup>
  defineProps({
    // Размеры берём от родителя (GameView) — те же, что пришли из GameMap через emit('ready')
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  })
</script>

<style scoped>
  .game-fog {
    /* Слой позиционируется поверх карты и сетки */
    position: absolute;
    top: 0;
    left: 0;

    /* Туман не должен перехватывать клики мышки — карта остаётся интерактивной */
    pointer-events: none;

    /* Пока изображения нет — слой прозрачен */
    overflow: hidden;
  }

  /*
    :deep() — пробиваемся сквозь scoped-изоляцию и стилизуем <img>,
    который вставлен снаружи через <slot />.
    Без :deep() scoped CSS не достанет до дочерних элементов.
  */
  .game-fog :deep(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(2px);
  }
</style>

<template>
  <!--
    Слой всплывающих цифр урона — рендерится поверх всего слоя токенов.
    Каждая запись в floats — это { id, uid, value, color, x, y }.
    x/y — пиксельные координаты центра токена внутри .game-view__map
  -->
  <TransitionGroup name="damage-float" tag="div" class="damage-float-layer">
    <div
      v-for="f in floats"
      :key="f.id"
      class="damage-float"
      :style="{ left: `${f.x}px`, top: `${f.y}px`, color: f.color }"
    >
      {{ f.value }}
    </div>
  </TransitionGroup>
</template>

<script setup>
  import { ref } from 'vue'

  // floats — массив активных всплытий
  const floats = ref([])
  let nextId = 0

  // Публичный метод: вызывается из GameTokens при нанесении урона
  // uid  — uid токена (для дебага, не используется в рендере)
  // value — число урона
  // x, y — пиксели центра токена в системе координат .game-view__map
  // color — цвет цифр (по умолчанию красный; в будущем разные типы урона)
  function spawn(uid, value, x, y, color = '#f87171') {
    const id = nextId++
    floats.value.push({ id, uid, value, x, y, color })
    // Убираем из массива после завершения анимации (900ms)
    setTimeout(() => {
      const idx = floats.value.findIndex((f) => f.id === id)
      if (idx !== -1) floats.value.splice(idx, 1)
    }, 900)
  }

  defineExpose({ spawn })
</script>

<style scoped>
  .damage-float-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;

    /* z-index выше токенов, ниже тумана и меню */
    z-index: calc(var(--z-tokens) + 1);
  }

  .damage-float {
    position: absolute;

    /* Центрируем относительно точки spawn */
    transform: translate(-50%, -50%);
    font-family: var(--font-ui);
    font-size: 22px;
    font-weight: 700;
    text-shadow:
      0 0 6px rgb(0 0 0 / 80%),
      0 2px 4px rgb(0 0 0 / 60%);
    white-space: nowrap;
    pointer-events: none;
  }

  /* ── Анимация всплытия ────────────────────────────────────────────────────── */

  /*
    TransitionGroup добавляет -enter-active / -leave-active / -enter-from / -leave-to.
    Появление: цифры выезжают снизу вверх и затухают.
    Уход: продолжают подниматься и исчезают.
  */

  .damage-float-enter-active {
    animation: damage-rise 0.9s ease-out forwards;
  }

  .damage-float-leave-active {
    /* Уход мгновенный — setTimeout убирает элемент точно в конце анимации */
    display: none;
  }

  @keyframes damage-rise {
    0% {
      opacity: 0;
      transform: translate(-50%, 0);
    }

    15% {
      opacity: 1;
      transform: translate(-50%, -14px);
    }

    70% {
      opacity: 1;
      transform: translate(-50%, -38px);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -60px);
    }
  }
</style>

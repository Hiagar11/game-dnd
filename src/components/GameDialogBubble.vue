<template>
  <!--
    Умное облако диалога.

    Логика позиционирования (onMounted + nextTick):
      1. По умолчанию рендерится над токеном по центру (opacity: 0 — невидимо).
      2. getBoundingClientRect() показывает реальные координаты во вьюпорте.
      3. Если облако обрезается сверху → опускается под токен (--below).
      4. Если обрезается по горизонтали → сдвигается внутрь вьюпорта (--shift).
      5. После коррекции: opacity: 1 + анимация появления.

    Хвостик всегда указывает на токен: CSS-переменная --shift двигает облако,
    а counter-shift на хвостике удерживает его над центром токена.

    Закрывается по клику вне облака — родитель должен закрыть через v-if.
    @click.stop предотвращает закрытие при клике внутри.
  -->
  <div
    ref="el"
    class="dialog-bubble"
    :class="{ 'dialog-bubble--below': below, 'dialog-bubble--ready': ready }"
    :style="{ '--shift': `${shiftX}px` }"
    @click.stop
  >
    {{ text }}
  </div>
</template>

<script setup>
  import { ref, onMounted, nextTick } from 'vue'

  defineProps({
    text: { type: String, required: true },
  })

  const el = ref(null)
  const below = ref(false) // true — облако под токеном
  const shiftX = ref(0) // горизонтальная коррекция в px
  const ready = ref(false) // true — замер завершён, показываем с анимацией

  onMounted(() => {
    // nextTick: ждём реального рендера перед замером
    nextTick(() => {
      if (!el.value) return

      const rect = el.value.getBoundingClientRect()
      const vw = window.innerWidth
      const MARGIN = 12

      // Переворачиваем вниз если облако выходит за верхний край вьюпорта
      if (rect.top < MARGIN) {
        below.value = true
      }

      // Горизонтальная коррекция: сдвигаем внутрь вьюпорта
      if (rect.left < MARGIN) {
        shiftX.value = MARGIN - rect.left // сдвиг вправо
      } else if (rect.right > vw - MARGIN) {
        shiftX.value = -(rect.right - (vw - MARGIN)) // сдвиг влево
      }

      ready.value = true
    })
  })
</script>

<style scoped>
  .dialog-bubble {
    position: absolute;
    z-index: 20;

    /* Позиция по умолчанию — над токеном по центру */
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(calc(-50% + var(--shift, 0px)));

    /* Стиль */
    background: #fff;
    color: #1a1a2e;
    font-family: var(--font-ui, sans-serif);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    padding: 6px 12px;
    border-radius: 12px;
    min-width: min-content;
    max-width: 320px;
    white-space: normal;
    overflow-wrap: break-word;
    box-shadow: 0 3px 14px rgb(0 0 0 / 55%);

    /* Разрешаем клики на облаке (для .stop) */
    pointer-events: auto;

    /* Скрыто до замера — избегаем фликера */
    opacity: 0;

    /*
      Хвостик — треугольник, по умолчанию внизу (указывает на токен снизу).
      calc(50% - var(--shift)) компенсирует горизонтальный сдвиг облака,
      чтобы хвостик всегда указывал на центр токена.
    */
    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: calc(50% - var(--shift, 0px));
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: #fff;
    }
  }

  /* Замер завершён — показываем с анимацией */
  .dialog-bubble--ready {
    opacity: 1;
    animation: bubble-pop 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  /* Облако под токеном: хвостик теперь сверху (указывает на токен сверху) */
  .dialog-bubble--below {
    bottom: auto;
    top: calc(100% + 12px);

    &::after {
      top: auto;
      bottom: 100%;
      border-top-color: transparent;
      border-bottom-color: #fff;
    }
  }

  @keyframes bubble-pop {
    from {
      opacity: 0;
      scale: 0.72;
    }

    to {
      opacity: 1;
      scale: 1;
    }
  }
</style>

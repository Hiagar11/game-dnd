<template>
  <!--
    Меню рендерится прямо внутри div-обёртки токена (GameTokens.vue).
    Размер = размер токена (inset: 0). z-index: 0 — за картинкой токена.

    Скрытое состояние: translate(0, 0) — прячется за токеном.
    Видимое состояние: translate(50%, -50%) — выезжает на половину своего
    размера вправо и вверх, открываясь из-за правого верхнего угла токена.
  -->
  <Transition name="ctx-slide">
    <div v-if="visible" class="token-ctx-menu" @click.stop @contextmenu.stop.prevent>
      <button
        class="token-ctx-menu__btn token-ctx-menu__btn--danger"
        title="Убрать с карты"
        @click="$emit('remove')"
      >
        <span class="token-ctx-menu__icon">✕</span>
      </button>

      <button class="token-ctx-menu__btn" title="Информация (скоро)" disabled>
        <span class="token-ctx-menu__icon">ℹ</span>
      </button>
    </div>
  </Transition>
</template>

<script setup>
  defineProps({
    visible: { type: Boolean, required: true },
  })

  defineEmits(['remove'])
</script>

<style scoped>
  /*
    Меню абсолютно позиционировано внутри .game-tokens__token.
    inset: 0 → размер и позиция = размер и позиция токена.
    z-index: 0 → позади .game-tokens__img (у которого z-index: 1).
    pointer-events: auto — нужен явно, т.к. .game-tokens наследует none.
    overflow: hidden — обрезает кнопки пока форма анимируется.

    Видимый transform: translate(50%, -50%) — сдвиг на 50% вправо и вверх.
    border-radius: var(--radius-md) — конечная форма (скруглённый квадрат).
  */
  .token-ctx-menu {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow:
      0 4px 16px rgb(0 0 0 / 70%),
      0 0 8px var(--color-primary-glow);

    /* Активная (видимая) позиция */
    transform: translate(50%, -50%);
  }

  .token-ctx-menu__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgb(255 255 255 / 8%);
    cursor: pointer;
    transition: background var(--transition-fast);

    &:last-child {
      border-bottom: none;
    }

    &:hover:not(:disabled) {
      background: rgb(255 255 255 / 10%);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    &--danger:hover {
      background: rgb(200 50 50 / 25%);
    }
  }

  .token-ctx-menu__icon {
    font-size: 18px;
    color: var(--color-text);
    line-height: 1;
    user-select: none;
  }

  /*
    Анимация через Vue <Transition name="ctx-slide">.

    Последовательность появления (enter), три этапа с паузами:
    1.   0ms — форма начинает выезжать (transform, 420ms)
    2.  80ms — форма одновременно начинает разворачиваться из круга
               в скруглённый прямоугольник (border-radius, 320ms)
    3. 380ms — кнопки проявляются когда форма практически готова (opacity, 140ms)

    Исчезновение (leave), обратная последовательность:
    1.   0ms — кнопки гаснут (80ms)
    2.  60ms — форма начинает сворачиваться в круг и заезжать (220ms)
  */
  .ctx-slide-enter-active {
    transition:
      transform 420ms cubic-bezier(0.22, 1, 0.36, 1) 0ms,
      border-radius 320ms cubic-bezier(0.22, 1, 0.36, 1) 80ms;
  }

  .ctx-slide-leave-active {
    transition:
      transform 220ms ease-in 60ms,
      border-radius 220ms ease-in 60ms;
  }

  /* Кнопки появляются в конце — когда форма уже сформировалась */
  .ctx-slide-enter-active .token-ctx-menu__btn {
    transition: opacity 140ms ease 380ms;
  }

  /* Кнопки исчезают первыми — до сворачивания формы */
  .ctx-slide-leave-active .token-ctx-menu__btn {
    transition: opacity 80ms ease 0ms;
  }

  /* Начальное (скрытое) состояние: круг под токеном */
  .ctx-slide-enter-from,
  .ctx-slide-leave-to {
    transform: translate(0, 0);
    border-radius: 50%;
  }

  /* Кнопки невидимы в скрытом состоянии */
  .ctx-slide-enter-from .token-ctx-menu__btn,
  .ctx-slide-leave-to .token-ctx-menu__btn {
    opacity: 0;
  }
</style>

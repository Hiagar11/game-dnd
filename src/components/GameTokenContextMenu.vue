<template>
  <!--
    Четыре кнопки-«лепестка» вылетают из центра токена в каждый угол.
    Анимация: круг в центре → скруглённый квадрат в углу.

    Углы:
      TL (левый верхний)  — Способности  (PhMagicWand)
      TR (правый верхний) — Удалить       (PhX, danger)
      BL (левый нижний)   — Инвентарь    (PhBackpack)
      BR (правый нижний)  — Характеристики (PhScroll)
  -->
  <Transition name="ctx">
    <div v-if="visible" class="token-ctx-menu" @click.stop @contextmenu.stop.prevent>
      <!-- TL — Способности: скрыта для системных токенов (у дверей/стен нет способностей) -->
      <button
        v-if="!systemToken"
        class="token-ctx-menu__btn token-ctx-menu__btn--tl"
        title="Способности"
        @mouseenter="playHover"
        @click="onAbilities"
      >
        <PhMagicWand :size="13" weight="fill" />
      </button>

      <!-- TR — Удалить -->
      <button
        class="token-ctx-menu__btn token-ctx-menu__btn--tr token-ctx-menu__btn--danger"
        title="Убрать с карты"
        @mouseenter="playHover"
        @click="onRemove"
      >
        <PhX :size="13" weight="bold" />
      </button>

      <!-- BL — Инвентарь: скрыт для системных токенов (у дверей/стен нет инвентаря) -->
      <button
        v-if="!systemToken"
        class="token-ctx-menu__btn token-ctx-menu__btn--bl"
        title="Инвентарь"
        @mouseenter="playHover"
        @click="onInventory"
      >
        <PhBackpack :size="13" weight="fill" />
      </button>

      <!-- BR — Характеристики -->
      <button
        class="token-ctx-menu__btn token-ctx-menu__btn--br"
        title="Характеристики"
        @mouseenter="playHover"
        @click="onEdit"
      >
        <PhScroll :size="13" weight="fill" />
      </button>
    </div>
  </Transition>
</template>

<script setup>
  import { PhX, PhMagicWand, PhBackpack, PhScroll } from '@phosphor-icons/vue'
  import { useSound } from '../composables/useSound'

  defineProps({
    visible: { type: Boolean, required: true },
    // Для системных токенов (двери, стены) скрываем инвентарь и способности
    systemToken: { type: Boolean, default: false },
  })

  const emit = defineEmits(['remove', 'edit', 'abilities', 'inventory'])

  const { playHover, playClick } = useSound()

  function onRemove() {
    emit('remove')
    playClick()
  }

  function onEdit() {
    emit('edit')
    playClick()
  }

  function onAbilities() {
    emit('abilities')
    playClick()
  }

  function onInventory() {
    emit('inventory')
    playClick()
  }
</script>

<style scoped>
  /*
    Контейнер — прозрачный, занимает ту же площадь что и токен (inset: 0).
    overflow: visible — кнопки могут выходить за края.
    pointer-events: none — сам контейнер не перехватывает клики, только кнопки.
  */
  .token-ctx-menu {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    overflow: visible;

    /* --offset: расстояние от угла кнопки до центра токена минус половина кнопки.
       = cellSize/2 - 14 (14 = половина ширины кнопки 28px).
       CSS-переменная --cell задаётся родительским элементом (.game-tokens__token). */
    --btn-half: 14px;
    --offset: calc(var(--cell, 60px) / 2 - var(--btn-half));
  }

  /* ── Базовые стили кнопки ── */
  .token-ctx-menu__btn {
    position: absolute;
    width: 28px;
    height: 28px;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface, #1a1a2e);
    border: 1px solid var(--color-primary, #a78bfa);
    border-radius: 8px;
    color: var(--color-text, #e2e8f0);
    cursor: pointer;
    transition:
      background 150ms ease,
      box-shadow 150ms ease,
      transform 100ms ease;
    box-shadow:
      0 3px 10px rgb(0 0 0 / 65%),
      0 0 6px var(--color-primary-glow, rgb(167 139 250 / 30%));

    &:hover {
      background: rgb(255 255 255 / 14%);
      box-shadow:
        0 4px 14px rgb(0 0 0 / 70%),
        0 0 10px var(--color-primary-glow, rgb(167 139 250 / 50%));
      transform: scale(1.12);
    }

    &--danger {
      border-color: #ef4444;
      box-shadow:
        0 3px 10px rgb(0 0 0 / 65%),
        0 0 6px rgb(239 68 68 / 30%);

      &:hover {
        background: rgb(200 40 40 / 30%);
        box-shadow:
          0 4px 14px rgb(0 0 0 / 70%),
          0 0 10px rgb(239 68 68 / 55%);
      }
    }

    /* Нереализованные функции — слегка затемнены */
    &--disabled {
      opacity: 0.55;
      cursor: default;

      &:hover {
        background: rgb(255 255 255 / 8%);
        transform: none;
      }
    }
  }

  /* ── Позиции угловых кнопок ── */
  .token-ctx-menu__btn--tl {
    top: 0;
    left: 0;
  }

  .token-ctx-menu__btn--tr {
    top: 0;
    right: 0;
  }

  .token-ctx-menu__btn--bl {
    bottom: 0;
    left: 0;
  }

  .token-ctx-menu__btn--br {
    bottom: 0;
    right: 0;
  }

  /* ══════════════════════════════════════════════════════
     Анимация: каждая кнопка вылетает из центра токена.
     enter-from: кнопка «свёрнута» в круг в центре.
     enter-to:   кнопка в своём углу (translate 0,0), скруглённый квадрат.
     ══════════════════════════════════════════════════════ */

  /* Общие параметры перехода для кнопок */
  .ctx-enter-active .token-ctx-menu__btn {
    transition:
      transform 380ms cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 300ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 200ms ease;
  }

  .ctx-leave-active .token-ctx-menu__btn {
    transition:
      transform 200ms ease-in,
      border-radius 200ms ease-in,
      opacity 150ms ease-in;
  }

  /* Начальное состояние (enter) и конечное (leave): круг в центре */
  .ctx-enter-from .token-ctx-menu__btn,
  .ctx-leave-to .token-ctx-menu__btn {
    opacity: 0;
    border-radius: 50%;
  }

  /* TL: из центра → верхний левый */
  .ctx-enter-from .token-ctx-menu__btn--tl {
    transform: translate(var(--offset), var(--offset));
  }

  .ctx-leave-to .token-ctx-menu__btn--tl {
    transform: translate(var(--offset), var(--offset));
  }

  /* TR: из центра → верхний правый */
  .ctx-enter-from .token-ctx-menu__btn--tr {
    transform: translate(calc(var(--offset) * -1), var(--offset));
  }

  .ctx-leave-to .token-ctx-menu__btn--tr {
    transform: translate(calc(var(--offset) * -1), var(--offset));
  }

  /* BL: из центра → нижний левый */
  .ctx-enter-from .token-ctx-menu__btn--bl {
    transform: translate(var(--offset), calc(var(--offset) * -1));
  }

  .ctx-leave-to .token-ctx-menu__btn--bl {
    transform: translate(var(--offset), calc(var(--offset) * -1));
  }

  /* BR: из центра → нижний правый */
  .ctx-enter-from .token-ctx-menu__btn--br {
    transform: translate(calc(var(--offset) * -1), calc(var(--offset) * -1));
  }

  .ctx-leave-to .token-ctx-menu__btn--br {
    transform: translate(calc(var(--offset) * -1), calc(var(--offset) * -1));
  }

  /* Видимое состояние: кнопки на месте */
  .ctx-enter-to .token-ctx-menu__btn,
  .ctx-leave-from .token-ctx-menu__btn {
    transform: translate(0, 0);
    border-radius: 8px;
    opacity: 1;
  }

  /* Небольшой стаггер — более живая анимация */
  .ctx-enter-active .token-ctx-menu__btn--tl {
    transition-delay: 0ms;
  }

  .ctx-enter-active .token-ctx-menu__btn--tr {
    transition-delay: 40ms;
  }

  .ctx-enter-active .token-ctx-menu__btn--bl {
    transition-delay: 80ms;
  }

  .ctx-enter-active .token-ctx-menu__btn--br {
    transition-delay: 120ms;
  }
</style>

<template>
  <!--
    Меню зрителя: та же визуальная структура, что у GameMenu — фиксированная панель внизу экрана.
    Отличие: только вкладка «Герои» (токены-персонажи, выбранные мастером).
    Кнопки добавления нет — зрители только смотрят.

    @menu-hover — эмитим true/false при наведении мыши на панель,
    чтобы ViewerView мог приглушить курсор мастера.
  -->
  <aside
    class="viewer-menu"
    @mouseenter="$emit('menu-hover', true)"
    @mouseleave="$emit('menu-hover', false)"
  >
    <!-- Разделитель слева — симметричен правой панели -->
    <div class="viewer-menu__side" />

    <!-- Центральная часть: вкладка Герои -->
    <div class="viewer-menu__center">
      <nav class="viewer-menu__tabs">
        <button class="viewer-menu__tab viewer-menu__tab--active">Герои</button>
      </nav>

      <!-- Список героев: только просмотр, без кнопки «+».
        JS-хук @enter при каждом новом герое записывает случайный цвет пламени '--flame-color'.
        Vue отслеживает изменения по :key="hero.id" — анимируются только действительно новые.
      -->
      <div class="viewer-menu__heroes">
        <p v-if="!heroesStore.heroes.length" class="viewer-menu__empty">Герои пока не выбраны…</p>
        <TransitionGroup name="hero-magic" @enter="onHeroEnter">
          <div
            v-for="hero in heroesStore.heroes"
            :key="hero.id"
            class="viewer-menu__hero"
            :title="hero.name"
          >
            <img :src="hero.src" :alt="hero.name" class="viewer-menu__hero-img" draggable="false" />
          </div>
        </TransitionGroup>
      </div>
    </div>

    <!-- Правая боковая панель — зеркально для симметрии -->
    <div class="viewer-menu__side viewer-menu__side--right" />
  </aside>
</template>

<script setup>
  import { useHeroesStore } from '../stores/heroes'

  defineEmits(['menu-hover'])

  const heroesStore = useHeroesStore()

  // Случайный цвет пламени для каждого нового героя
  const FLAME_COLORS = ['#f20', '#00cc44', '#0066ff']

  function onHeroEnter(el) {
    el.style.setProperty(
      '--flame-color',
      FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)]
    )
  }
</script>

<style lang="scss" scoped>
  .viewer-menu {
    position: fixed;
    bottom: 0;
    z-index: var(--z-menu);
    inline-size: 100%;
    block-size: var(--menu-height);
    background-color: var(--color-overlay);
    display: flex;
    animation: menu-slide-in var(--menu-animation-duration) ease-out var(--menu-animation-delay)
      both;

    &__center {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      block-size: calc(100% + var(--menu-overflow));
      margin-block-start: calc(-1 * var(--menu-overflow));
    }

    &__tabs {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      padding: 0 4px;
      block-size: var(--menu-overflow);
      background-color: transparent;
      flex-shrink: 0;
    }

    &__tab {
      padding: 2px 14px;
      border: 1px solid rgb(255 255 255 / 20%);
      border-bottom: none;
      border-radius: 6px 6px 0 0;
      background-image: url('/systemImage/panel-center.jpg');
      background-size: cover;
      color: var(--color-text-muted);
      font-size: 11px;
      font-family: var(--font-ui);
      letter-spacing: 0.04em;
      cursor: default;

      &--active {
        background-image: url('/systemImage/panel-side.jpg');
        background-position: center;
        color: var(--color-text);
        border-color: rgb(255 255 255 / 35%);
      }
    }

    /* Список героев — то же оформление, что у game-menu-heroes */
    &__heroes {
      @include menu-panel-content;
    }

    &__empty {
      font-size: 12px;
      color: var(--color-text-muted);
      align-self: center;
      width: 100%;
      text-align: center;
    }

    &__hero {
      width: var(--token-size);
      height: var(--token-size);
      flex-shrink: 0;
      border: 2px solid var(--color-primary);
      border-radius: var(--radius-full);
      overflow: hidden;
      box-shadow: 0 0 8px var(--color-primary-glow);
    }

    &__hero-img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Боковые панели — симметрия с GameMenu */
    &__side {
      inline-size: var(--menu-side-width);
      block-size: calc(100% + var(--menu-overflow));
      margin-block-start: calc(-1 * var(--menu-overflow));
      background-image: url('/systemImage/panel-side.jpg');
      background-size: cover;
      background-position: bottom;

      &--right {
        border-top-left-radius: var(--menu-side-radius);
      }

      &:not(&--right) {
        border-top-right-radius: var(--menu-side-radius);
      }
    }
  }

  /* ── Анимация появления героя в меню зрителя ─────────────────────────────
     --flame-color задаётся JS-хуком onHeroEnter случайным цветом.

     Принцип работы «скрытого токена»:
       filter: brightness(N) при N >> 1 выжигает изображение в белый цвет —
       токен не виден. Когда brightness возвращается к 1, изображение плавно
       проявляется само собой, без отдельной opacity-анимации на img.

     Этапы (2.5s):
       0–10%    искра: крохотная точка, экстремальный blur + яркость
       10–25%   воспламенение: рост, первые языки пламени вверх
       25–60%   горение: три фазы мерцания, языки меняют форму/высоту
       60–80%   угасание: языки опадают, токен начинает проступать
       80–100%  проявление: гаснет пламя, токен появляется с золотым свечением
  */
  .hero-magic-enter-active {
    animation: hero-magic-in 2.5s ease-out both;
  }

  @keyframes hero-magic-in {
    /* ── Искра ── */
    0% {
      transform: scale(0.04);
      filter: brightness(30) blur(10px);
      box-shadow:
        0 0 6px 4px var(--flame-color, #f20),
        0 0 18px 6px var(--flame-color, #f20);
    }

    /* ── Воспламенение: искра разгорается, появляются языки ── */
    10% {
      transform: scale(0.3);
      filter: brightness(18) blur(4px);
      box-shadow:
        0 -12px 10px -2px var(--flame-color, #f20),
        -4px -6px 7px -2px var(--flame-color, #f20),
        4px -6px 7px -2px var(--flame-color, #f20),
        0 0 28px 10px var(--flame-color, #f20);
    }

    22% {
      transform: scale(1.12);
      filter: brightness(10) blur(1px);
      box-shadow:
        0 -30px 18px -4px var(--flame-color, #f20),
        -10px -18px 13px -5px var(--flame-color, #f20),
        10px -18px 13px -5px var(--flame-color, #f20),
        0 0 42px 16px var(--flame-color, #f20);
    }

    /* ── Горение: мерцание языков (3 фазы) ── */
    33% {
      transform: scale(1.05) scaleY(1.12);
      filter: brightness(8);
      box-shadow:
        0 -38px 22px -5px var(--flame-color, #f20),
        -13px -22px 16px -6px var(--flame-color, #f20),
        13px -24px 17px -6px var(--flame-color, #f20),
        0 0 48px 18px var(--flame-color, #f20);
    }

    45% {
      transform: scale(1.2) scaleY(0.94);
      filter: brightness(9);
      box-shadow:
        0 -26px 20px -3px var(--flame-color, #f20),
        -8px -20px 15px -4px var(--flame-color, #f20),
        15px -14px 11px -6px var(--flame-color, #f20),
        0 0 40px 14px var(--flame-color, #f20);
    }

    57% {
      transform: scale(1.06) scaleY(1.18);
      filter: brightness(7);
      box-shadow:
        0 -44px 26px -6px var(--flame-color, #f20),
        -15px -26px 19px -6px var(--flame-color, #f20),
        9px -30px 22px -6px var(--flame-color, #f20),
        0 0 44px 17px var(--flame-color, #f20);
    }

    /* ── Угасание: языки опадают ── */
    70% {
      transform: scale(1.02);
      filter: brightness(4);
      box-shadow:
        0 -14px 11px -4px var(--flame-color, #f20),
        -5px -8px 7px -5px var(--flame-color, #f20),
        5px -8px 7px -5px var(--flame-color, #f20),
        0 0 22px 7px var(--flame-color, #f20);
    }

    82% {
      transform: scale(1);
      filter: brightness(2);
      box-shadow:
        0 0 10px 3px var(--flame-color, #f20),
        0 0 6px 1px var(--color-primary-glow);
    }

    /* ── Проявление токена ── */
    100% {
      transform: scale(1);
      filter: brightness(1);
      box-shadow: 0 0 8px var(--color-primary-glow);
    }
  }
</style>

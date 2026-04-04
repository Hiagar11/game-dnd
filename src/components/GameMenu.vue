<script setup>
  import { ref } from 'vue'
  import GameMenuIcon from './GameMenuIcon.vue'
  import GameMenuTokens from './GameMenuTokens.vue'
  import GameMenuSystem from './GameMenuSystem.vue'

  // Активная вкладка центральной панели: 'tokens' | 'system'
  const activeTab = ref('tokens')
</script>

<template>
  <aside class="game-menu">
    <GameMenuIcon />

    <!-- Центральная часть: вкладки + контент -->
    <div class="game-menu__center">
      <!-- Вкладки переключения -->
      <nav class="game-menu__tabs">
        <button
          class="game-menu__tab"
          :class="{ 'game-menu__tab--active': activeTab === 'tokens' }"
          @click="activeTab = 'tokens'"
        >
          Токены
        </button>
        <button
          class="game-menu__tab"
          :class="{ 'game-menu__tab--active': activeTab === 'system' }"
          @click="activeTab = 'system'"
        >
          Системные
        </button>
      </nav>

      <!-- Контент вкладки -->
      <GameMenuTokens v-if="activeTab === 'tokens'" />
      <GameMenuSystem v-else />
    </div>

    <!-- Правая панель — зарезервирована под будущий функционал -->
    <div class="game-menu__empty">
      <slot name="right-panel" />
    </div>
  </aside>
</template>

<style lang="scss">
  .game-menu {
    position: fixed;
    bottom: 0;
    z-index: var(--z-menu);
    inline-size: 100%;
    block-size: var(--menu-height);
    background-color: var(--color-overlay);
    display: flex;
    animation: menu-slide-in var(--menu-animation-duration) ease-out var(--menu-animation-delay)
      both;

    /* Центральная часть: выступает вверх наравне с боковыми панелями */
    &__center {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      block-size: calc(100% + var(--menu-overflow));
      margin-block-start: calc(-1 * var(--menu-overflow));
    }

    /* Полоса вкладок — ровно на высоту выступа, кнопки прижаты к низу */
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
      cursor: pointer;
      transition:
        background var(--transition-fast),
        color var(--transition-fast);

      &:hover {
        background-image: url('/systemImage/panel-side.jpg');
        background-position: center;
        color: var(--color-text);
      }

      &--active {
        background-image: url('/systemImage/panel-side.jpg');
        background-position: center;
        color: var(--color-text);
        border-color: rgb(255 255 255 / 35%);
      }
    }

    &__empty {
      inline-size: var(--menu-side-width);
      block-size: calc(100% + var(--menu-overflow));
      margin-block-start: calc(-1 * var(--menu-overflow));
      background-image: url('/systemImage/panel-side.jpg');
      background-size: cover;
      background-position: bottom;
      border-top-left-radius: var(--menu-side-radius);
    }
  }

  @keyframes menu-slide-in {
    from {
      transform: translateY(100%);
    }

    to {
      transform: translateY(0);
    }
  }
</style>

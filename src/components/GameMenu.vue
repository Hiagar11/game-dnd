<script setup>
  import { ref } from 'vue'
  import { PhUsers, PhGearSix, PhShieldStar } from '@phosphor-icons/vue'
  import GameMenuIcon from './GameMenuIcon.vue'
  import GameMenuTokenList from './GameMenuTokenList.vue'
  import GameMenuSystem from './GameMenuSystem.vue'
  import { useSound } from '../composables/useSound'

  // Активная вкладка центральной панели: 'tokens' | 'system' | 'heroes'
  const activeTab = ref('tokens')
  const { playHover, playClick } = useSound()

  function setTab(tab) {
    activeTab.value = tab
    playClick()
  }
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
          @mouseenter="playHover"
          @click="setTab('tokens')"
        >
          <PhUsers :size="13" />
          Токены
        </button>
        <button
          class="game-menu__tab"
          :class="{ 'game-menu__tab--active': activeTab === 'system' }"
          @mouseenter="playHover"
          @click="setTab('system')"
        >
          <PhGearSix :size="13" />
          Системные
        </button>
        <button
          class="game-menu__tab"
          :class="{ 'game-menu__tab--active': activeTab === 'heroes' }"
          @mouseenter="playHover"
          @click="setTab('heroes')"
        >
          <PhShieldStar :size="13" />
          Герои
        </button>
      </nav>

      <!-- Контент вкладки -->
      <GameMenuTokenList v-if="activeTab === 'tokens'" token-type="npc" />
      <GameMenuSystem v-else-if="activeTab === 'system'" />
      <GameMenuTokenList v-else token-type="hero" />
    </div>

    <!-- Правая панель — зарезервирована под будущий функционал -->
    <div class="game-menu__empty">
      <slot name="right-panel" />
    </div>
  </aside>
</template>

<style lang="scss" scoped>
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
      display: inline-flex;
      align-items: center;
      gap: 4px;
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
</style>

<script setup>
  import GameMenuIcon from './GameMenuIcon.vue'
  import GameMenuTokens from './GameMenuTokens.vue'
</script>

<template>
  <aside class="game-menu">
    <GameMenuIcon />
    <GameMenuTokens />

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

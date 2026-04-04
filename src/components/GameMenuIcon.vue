<template>
  <!-- Левая боковая панель: показывает иконку и имя выбранного токена -->
  <div class="game-menu-icon">
    <img
      v-if="store.selectedToken"
      :src="store.selectedToken.src"
      :alt="store.selectedToken.name"
      class="game-menu-icon__img"
    />
    <span v-if="store.selectedToken" class="game-menu-icon__name">
      {{ store.selectedToken.name }}
    </span>
  </div>
</template>

<script setup>
  import { useGameStore } from '../stores/game'

  const store = useGameStore()
</script>

<style scoped>
  .game-menu-icon {
    inline-size: var(--menu-side-width);
    block-size: calc(100% + var(--menu-overflow));
    margin-block-start: calc(-1 * var(--menu-overflow));
    padding: var(--space-2);
    background-image: url('/systemImage/panel-side.jpg');
    background-size: cover;
    background-position: top;
    border-top-right-radius: var(--menu-side-radius);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  .game-menu-icon__img {
    inline-size: 80%;
    block-size: 80%;
    aspect-ratio: 1;
    object-fit: contain;
    border-radius: var(--radius-full);
  }

  .game-menu-icon__name {
    font-family: var(--font-base);
    font-size: 12px;
    color: var(--color-text);
    text-align: center;
    overflow-wrap: break-word;
  }
</style>

<template>
  <!-- Левая боковая панель: показывает иконку и имя активного токена.
       Приоритет: выбранный на карте → выбранный в меню. -->
  <div class="game-menu-icon">
    <img
      v-if="activeToken"
      :src="activeToken.src"
      :alt="activeToken.name"
      class="game-menu-icon__img"
    />
    <span v-if="activeToken" class="game-menu-icon__name">
      {{ activeToken.name }}
    </span>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useGameStore } from '../stores/game'

  const store = useGameStore()

  // Определяет, какой токен показывать в иконке.
  // Приоритет у токена выбранного на карте — он конкретнее.
  // Если ничего не выбрано на карте — показываем выбранный в меню.
  const activeToken = computed(() => {
    if (store.selectedPlacedUid) {
      // Находим экземпляр на карте по uid
      const placed = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
      // По tokenId находим определение (src, name)
      return placed ? store.tokens.find((t) => t.id === placed.tokenId) : null
    }

    return store.selectedToken
  })
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

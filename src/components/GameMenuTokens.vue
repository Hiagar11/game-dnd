<template>
  <!-- Центральная панель: список всех токенов для выбора + кнопка добавления -->
  <div class="game-menu-tokens">
    <!-- Кнопка добавления нового токена — всегда первая в списке -->
    <button
      class="game-menu-tokens__item game-menu-tokens__item--add"
      title="Добавить токен"
      @click="isPopupOpen = true"
    >
      <span class="game-menu-tokens__add-icon">+</span>
    </button>

    <button
      v-for="token in store.tokens"
      :key="token.id"
      class="game-menu-tokens__item"
      :class="{ 'game-menu-tokens__item--active': store.selectedToken?.id === token.id }"
      :title="token.name"
      draggable="false"
      @click="store.selectToken(token.id)"
      @dragstart="onDragStart($event, token)"
    >
      <!--
        draggable="false" на img — отключает встроенное перетаскивание картинки,
        чтобы браузер тянул всю кнопку, а не только изображение.
      -->
      <img :src="token.src" :alt="token.name" class="game-menu-tokens__img" draggable="true" />
    </button>
  </div>

  <GameTokenEditPopup :visible="isPopupOpen" @close="isPopupOpen = false" />
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useTokenDrag } from '../composables/useTokenDrag'
  import GameTokenEditPopup from './GameTokenEditPopup.vue'

  const store = useGameStore()
  const { onDragStart } = useTokenDrag()

  const isPopupOpen = ref(false)

  onMounted(() => store.fetchTokens())
</script>

<style scoped>
  .game-menu-tokens {
    flex-grow: 1;
    padding: var(--space-2);
    background-image: url('/systemImage/panel-center.jpg');
    background-size: 340px;
    background-position: center;
    box-shadow:
      inset 15px 0 15px -5px var(--color-overlay-strong),
      inset -15px 0 15px -5px var(--color-overlay-strong);
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: var(--space-2);
    min-height: 0; /* чтобы overflow-y: auto заработал внутри flex */
    overflow-y: auto;
  }

  .game-menu-tokens__item {
    width: var(--token-size);
    height: var(--token-size);
    flex-shrink: 0;
    padding: 0;
    border: 2px solid rgb(255 255 255 / 40%);
    border-radius: var(--radius-full);
    background: var(--color-overlay);
    cursor: pointer;
    overflow: hidden;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: rgb(255 255 255 / 60%);
    }

    /* Выбранный токен — золотая обводка */
    &--active {
      border-color: var(--color-primary);
      box-shadow: 0 0 8px var(--color-primary-glow);
    }
  }

  .game-menu-tokens__item--add {
    border-style: dashed;
    border-color: rgb(255 255 255 / 30%);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .game-menu-tokens__add-icon {
    font-size: 28px;
    line-height: 1;
    user-select: none;
  }

  .game-menu-tokens__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>

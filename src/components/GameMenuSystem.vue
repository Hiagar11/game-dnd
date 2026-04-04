<template>
  <!-- Центральная панель: список системных токенов (двери, ловушки и т.д.) -->
  <div class="game-menu-system">
    <button
      v-for="token in SYSTEM_TOKENS"
      :key="token.id"
      class="game-menu-system__item"
      :title="token.name"
      draggable="false"
      @dragstart="onDragStart($event, token)"
    >
      <img :src="token.src" :alt="token.name" class="game-menu-system__img" draggable="true" />
    </button>
  </div>
</template>

<script setup>
  import { SYSTEM_TOKENS } from '../stores/game'

  // Drag системного токена: пишем в dataTransfer ключ 'systemToken' со строковым id.
  // В useTokenDrop этот ключ отличается от обычного 'tokenId' и роутится в placeSystemToken.
  function onDragStart(e, token) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('systemToken', token.id)
  }
</script>

<style scoped>
  .game-menu-system {
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
    min-height: 0;
    overflow-y: auto;
  }

  .game-menu-system__item {
    width: var(--token-size);
    height: var(--token-size);
    flex-shrink: 0;
    padding: 0;
    border: 2px solid rgb(255 255 255 / 40%);
    border-radius: var(--radius-full);
    background: var(--color-overlay);
    cursor: grab;
    overflow: hidden;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: rgb(255 255 255 / 70%);
    }

    &:active {
      cursor: grabbing;
    }
  }

  .game-menu-system__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>

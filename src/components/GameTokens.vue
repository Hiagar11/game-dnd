<template>
  <!--
    Слой токенов на карте — четвёртый слой (поверх сетки, под туманом).
    Каждый токен позиционируется абсолютно внутри слоя по col/row * cellSize.
  -->
  <div class="game-tokens" :style="{ width: `${width}px`, height: `${height}px` }">
    <div
      v-for="placed in store.placedTokens"
      :key="placed.uid"
      class="game-tokens__token"
      :style="{
        left: `${placed.col * store.cellSize}px`,
        top: `${placed.row * store.cellSize}px`,
        width: `${store.cellSize}px`,
        height: `${store.cellSize}px`,
      }"
    >
      <img
        :src="getTokenDef(placed.tokenId)?.src"
        :alt="getTokenDef(placed.tokenId)?.name"
        class="game-tokens__img"
        draggable="false"
      />
    </div>
  </div>
</template>

<script setup>
  import { useGameStore } from '../stores/game'

  defineProps({
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  })

  const store = useGameStore()

  // Находит определение токена (src, name) по tokenId.
  // Вынесено в функцию чтобы не дублировать в шаблоне дважды.
  function getTokenDef(tokenId) {
    return store.tokens.find((t) => t.id === tokenId)
  }
</script>

<style scoped>
  .game-tokens {
    position: absolute;
    top: 0;
    left: 0;
    z-index: var(--z-tokens);
    pointer-events: none;
  }

  .game-tokens__token {
    position: absolute;

    /* Небольшой отступ чтобы токен не прилегал вплотную к краям ячейки */
    padding: 4px;
  }

  .game-tokens__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: var(--radius-full);
  }
</style>

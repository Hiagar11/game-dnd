<template>
  <!--
    Слой токенов на карте — четвёртый слой (поверх сетки, под туманом).
    Каждый токен позиционируется абсолютно внутри слоя по col/row * cellSize.
    pointer-events: none на контейнере — клики проходят сквозь пустое пространство.
    Сами токены включают pointer-events обратно через CSS (see .game-tokens__token).
  -->
  <div class="game-tokens" :style="{ width: `${width}px`, height: `${height}px` }">
    <div
      v-for="placed in store.placedTokens"
      :key="placed.uid"
      class="game-tokens__token"
      :class="{ 'game-tokens__token--selected': store.selectedPlacedUid === placed.uid }"
      :style="{
        left: `${placed.col * store.cellSize}px`,
        top: `${placed.row * store.cellSize}px`,
        width: `${store.cellSize}px`,
        height: `${store.cellSize}px`,
      }"
      @click.stop="store.selectPlacedToken(placed.uid)"
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

    /* Пустое пространство слоя не перехватывает клики — проходят к карте */
    pointer-events: none;
  }

  .game-tokens__token {
    position: absolute;
    padding: 4px;

    /* Включаем клики обратно только на самом токене */
    pointer-events: auto;
    cursor: pointer;
  }

  .game-tokens__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: var(--radius-full);
  }

  /*
    Вращающийся бордер через ::before + conic-gradient + CSS mask.

    Как это работает:
    1. ::before занимает всю площадь токена (inset: 0).
    2. padding: 3px создаёт «кольцо» — разницу между content-box и border-box.
    3. background: conic-gradient рисует конический градиент на всём круге.
    4. mask убирает внутреннюю часть (content-box), оставляя только кольцо:
         - первая маска: content-box (внутренний круг) — белый = видимый
         - вторая маска: весь элемент — белый = видимый
         - mask-composite: exclude = XOR: видно только то, что есть в одной маске
           → остаётся только кольцо шириной padding.
    5. animation вращает ::before — вместе с ним вращается и градиент.
  */
  .game-tokens__token--selected::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: var(--radius-full);
    padding: 3px;
    background: conic-gradient(
      var(--color-primary) 0deg,
      var(--color-primary-dark) 90deg,
      transparent 160deg,
      transparent 200deg,
      var(--color-primary-dark) 270deg,
      var(--color-primary) 360deg
    );
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    animation: token-spin 3s linear infinite;
  }

  @keyframes token-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

<template>
  <!--
    Предметы на земле — светящиеся кучки лута (как в Diablo 2).
    Рендерятся между RangeOverlay (z:2) и GameTokens (z:3).
    Контейнер pointer-events: none, отдельные кучки — pointer-events: auto.
  -->
  <div class="game-ground-loot" :style="{ width: `${width}px`, height: `${height}px` }">
    <div
      v-for="pile in store.groundItems"
      :key="pile.id"
      class="game-ground-loot__pile"
      :style="pileStyle(pile)"
      @click.stop="onPileClick(pile)"
    >
      <img
        src="https://api.iconify.design/game-icons/swap-bag.svg?color=%23ffd700"
        alt="Лут"
        class="game-ground-loot__bag"
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

  const emit = defineEmits(['open-loot'])

  const store = useGameStore()

  function pileStyle(pile) {
    const hc = store.halfCell
    return {
      left: `${pile.col * hc + store.gridNormOX}px`,
      top: `${pile.row * hc + store.gridNormOY}px`,
      width: `${hc}px`,
      height: `${hc}px`,
    }
  }

  function onPileClick(pile) {
    emit('open-loot', pile)
  }
</script>

<style scoped lang="scss" src="../assets/styles/components/gameGroundLoot.scss"></style>

<template>
  <button class="level-card" :disabled="isLoading" @mouseenter="playHover" @click="onClick">
    <img v-if="scenario.mapImageUrl" :src="scenario.mapImageUrl" class="level-card__img" alt="" />
    <div v-else class="level-card__no-img">Нет карты</div>
    <p class="level-card__name">{{ scenario.name || 'Без названия' }}</p>
    <span v-if="isLoading" class="level-card__loading">Загрузка…</span>
  </button>
</template>

<script setup>
  import { useSound } from '../composables/useSound'

  defineProps({
    scenario: { type: Object, required: true },
    isLoading: { type: Boolean, default: false },
  })

  const emit = defineEmits(['click'])

  const { playHover, playClick } = useSound()

  function onClick() {
    emit('click')
    playClick()
  }
</script>

<style scoped>
  .level-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: hidden;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 30%);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: rgb(255 255 255 / 5%);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.6;
    }
  }

  .level-card__img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }

  .level-card__no-img {
    width: 100%;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(255 255 255 / 4%);
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .level-card__name {
    color: var(--color-text);
    padding: var(--space-2) var(--space-3);
    font-size: 13px;
    text-align: left;
  }

  .level-card__loading {
    display: block;
    padding: var(--space-1) var(--space-3) var(--space-2);
    font-size: 11px;
    color: var(--color-text-muted);
  }
</style>

<template>
  <PopupShell :visible="visible" aria-label="Выбор остановки" @close="$emit('close')">
    <h3 class="stop-picker__title">Выберите остановку на глобальной карте</h3>

    <p v-if="!stops.length" class="stop-picker__empty">
      На глобальной карте нет остановок. Сначала добавьте их в разделе «Глобальная карта».
    </p>

    <ul v-else class="stop-picker__list">
      <li v-for="stop in stops" :key="stop.uid" class="stop-picker__item">
        <button class="stop-picker__btn" @click="onPick(stop)">
          <span class="stop-picker__dot" />
          <span class="stop-picker__label">{{ stop.label || 'Без названия' }}</span>
        </button>
      </li>
    </ul>
  </PopupShell>
</template>

<script setup>
  import PopupShell from './PopupShell.vue'

  defineProps({
    visible: { type: Boolean, required: true },
    stops: { type: Array, default: () => [] },
  })

  const emit = defineEmits(['close', 'pick'])

  function onPick(stop) {
    emit('pick', stop)
  }
</script>

<style scoped>
  .stop-picker__title {
    margin: 0 0 var(--space-4);
    font-size: 16px;
    color: var(--color-text);
  }

  .stop-picker__empty {
    color: var(--color-text-muted);
    font-size: 13px;
  }

  .stop-picker__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .stop-picker__item {
    margin: 0;
  }

  .stop-picker__btn {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: rgb(255 255 255 / 3%);
    color: var(--color-text);
    font-size: 14px;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      background: rgb(200 154 74 / 12%);
      border-color: var(--color-primary);
    }
  }

  .stop-picker__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-primary);
    flex-shrink: 0;
  }

  .stop-picker__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

<template>
  <div class="stats-grid">
    <div class="stats-grid__title">Характеристики</div>
    <div class="stats-grid__cells">
      <label v-for="stat in STATS" :key="stat.key" class="stats-grid__label" :title="stat.hint">
        <span class="stats-grid__name">{{ stat.label }}</span>
        <input
          :value="modelValue[stat.key]"
          type="number"
          min="0"
          class="stats-grid__input"
          @input="$emit('update:modelValue', { ...modelValue, [stat.key]: +$event.target.value })"
        />
      </label>
    </div>
  </div>
</template>

<script setup>
  defineProps({ modelValue: { type: Object, required: true } })
  defineEmits(['update:modelValue'])

  const STATS = [
    { key: 'meleeDmg', label: 'Урон (ближн.)', hint: 'Урон в ближнем бою' },
    { key: 'rangedDmg', label: 'Урон (дальн.)', hint: 'Урон в дальнем бою' },
    { key: 'visionRange', label: 'Дальн. видим.', hint: 'Дальность видимости (в ячейках)' },
    { key: 'defense', label: 'Защита', hint: 'Бонус к броне/защите' },
    { key: 'evasion', label: 'Уклонение', hint: 'Бонус к уклонению от атак' },
  ]
</script>

<style scoped>
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .stats-grid__title {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .stats-grid__cells {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: var(--space-3);
  }

  .stats-grid__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-family: var(--font-ui);
    cursor: default;
  }

  .stats-grid__name {
    font-size: 11px;
    color: var(--color-text-muted);
    letter-spacing: 0.04em;
  }

  .stats-grid__input {
    padding: var(--space-2) var(--space-3);
    background: rgb(255 255 255 / 6%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 14px;
    font-family: var(--font-ui);
    outline: none;
    text-align: center;
    transition: border-color var(--transition-fast);
    appearance: textfield;

    &:focus {
      border-color: var(--color-primary);
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      appearance: none;
    }
  }
</style>

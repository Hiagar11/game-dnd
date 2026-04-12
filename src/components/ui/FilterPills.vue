<template>
  <div class="filter-pills" role="group" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="filter-pills__btn"
      :class="{ 'filter-pills__btn--active': option.value === modelValue }"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
  defineProps({
    modelValue: {
      type: [String, Number, Boolean, null],
      default: null,
    },
    options: {
      type: Array,
      required: true,
    },
    ariaLabel: {
      type: String,
      default: 'Фильтр',
    },
  })

  defineEmits(['update:modelValue'])
</script>

<style scoped>
  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .filter-pills__btn {
    background: rgb(0 0 0 / 32%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: 12px;
    padding: 4px 10px;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);
  }

  .filter-pills__btn:hover {
    border-color: #557;
    color: var(--color-text);
  }

  .filter-pills__btn--active {
    background: rgb(200 154 74 / 15%);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
</style>

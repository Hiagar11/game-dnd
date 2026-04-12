<template>
  <div class="stats-grid">
    <div v-for="row in STAT_ROWS" :key="row.primary.key" class="stats-grid__row">
      <!-- Левая часть: иконка + название + инпут -->
      <label class="stats-grid__primary" :title="row.primary.hint">
        <span class="stats-grid__primary-name">
          <component :is="row.primary.icon" :size="18" weight="bold" />
          {{ row.primary.label }}
        </span>
        <div class="stats-grid__primary-values">
          <input
            :value="modelValue[row.primary.key]"
            type="number"
            min="0"
            class="stats-grid__input"
            @input="
              $emit('update:modelValue', { ...modelValue, [row.primary.key]: +$event.target.value })
            "
          />
          <span
            v-if="primaryBonus(row.primary.key)"
            class="stats-grid__bonus"
            :class="
              primaryBonus(row.primary.key) > 0
                ? 'stats-grid__bonus--pos'
                : 'stats-grid__bonus--neg'
            "
          >
            {{ formatBonus(primaryBonus(row.primary.key)) }}
          </span>
        </div>
      </label>

      <!-- Разделитель -->
      <div class="stats-grid__sep" aria-hidden="true" />

      <!-- Правая часть: два пассивных навыка -->
      <div class="stats-grid__pair">
        <template v-for="stat in row.derived" :key="stat.key">
          <div class="stats-grid__sep" aria-hidden="true" />
          <div class="stats-grid__derived" :title="stat.hint">
            <component :is="stat.icon" :size="15" />
            <span class="stats-grid__derived-name">{{ stat.label }}</span>
            <div class="stats-grid__derived-values">
              <span
                class="stats-grid__derived-value"
                :class="{
                  'stats-grid__derived-value--up': flashingKeys.has(stat.key),
                  'stats-grid__derived-value--arrow': arrowKeys.has(stat.key),
                }"
                >{{ computeDerived(stat.key) }}</span
              >
              <span
                v-if="derivedBonus(stat.key)"
                class="stats-grid__bonus"
                :class="
                  derivedBonus(stat.key) > 0 ? 'stats-grid__bonus--pos' : 'stats-grid__bonus--neg'
                "
              >
                {{ formatBonus(derivedBonus(stat.key)) }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { toRef } from 'vue'
  import { useTraitsStore } from '../stores/traits'
  import { STAT_ROWS } from '../constants/tokenStatRows'
  import { useTokenGearBonuses } from '../composables/useTokenGearBonuses'
  import { useTokenDerivedStats } from '../composables/useTokenDerivedStats'
  import { useDerivedStatFlash } from '../composables/useDerivedStatFlash'

  const props = defineProps({
    modelValue: { type: Object, required: true },
    inventory: { type: Object, default: null },
  })
  defineEmits(['update:modelValue'])
  const traitsStore = useTraitsStore()
  const modelValueRef = toRef(props, 'modelValue')
  const inventoryRef = toRef(props, 'inventory')

  const { totalStats, primaryBonus, directDerivedBonus } = useTokenGearBonuses({
    inventory: inventoryRef,
    modelValue: modelValueRef,
    traitsStore,
  })

  const { computeDerived, derivedBonus } = useTokenDerivedStats({
    totalStats,
    modelValue: modelValueRef,
    directDerivedBonus,
  })

  function formatBonus(value) {
    return `${value > 0 ? '+' : ''}${value}`
  }

  const { flashingKeys, arrowKeys } = useDerivedStatFlash({
    modelValue: modelValueRef,
    computeDerived,
  })
</script>

<style scoped>
  .stats-grid {
    display: flex;
    flex-direction: column;
  }

  .stats-grid__row {
    display: grid;
    grid-template-columns: auto 1px 1fr;
    align-items: center;
    gap: 0 15px;
    padding: var(--space-2) 0;
    border-bottom: 1px solid rgb(255 255 255 / 6%);

    &:last-child {
      border-bottom: none;
    }
  }

  .stats-grid__primary {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    cursor: default;
  }

  .stats-grid__primary-values,
  .stats-grid__derived-values {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .stats-grid__primary-name {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 1.5rem;
    font-family: var(--font-ui);
    color: var(--color-text);
    width: 9rem;
  }

  .stats-grid__input {
    width: 4rem;
    padding: var(--space-1) var(--space-2);
    background: rgb(255 255 255 / 6%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 1.5rem;
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

  .stats-grid__sep {
    width: 1px;
    align-self: stretch;
    background: rgb(255 255 255 / 15%);
    margin: var(--space-1) 0;
  }

  .stats-grid__pair {
    display: grid;
    grid-template-columns: 1px 1fr 1px 1fr;
    align-items: center;
    gap: 0 15px;
  }

  .stats-grid__derived {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    flex: 1;
  }

  .stats-grid__derived-name {
    font-size: 1rem;
    font-family: var(--font-ui);
    white-space: nowrap;
  }

  .stats-grid__derived-value {
    font-size: 1.5rem;
    font-family: var(--font-ui);
    font-weight: 600;
    color: var(--color-primary);
    transition: color 0.2s;
  }

  .stats-grid__derived-values {
    margin-left: auto;
  }

  .stats-grid__bonus {
    min-width: 2.5rem;
    text-align: right;
    font-size: 1rem;
    font-family: var(--font-ui);
    font-weight: 700;
  }

  .stats-grid__bonus--pos {
    color: #4ade80;
  }

  .stats-grid__bonus--neg {
    color: #f87171;
  }

  .stats-grid__derived-value--up {
    animation: stat-up 0.6s ease forwards;
  }

  .stats-grid__derived-value--arrow {
    position: relative;

    &::after {
      content: '\25B2';
      position: absolute;
      top: -6px;
      right: -12px;
      font-size: 9px;
      color: #4ade80;
      animation: arrow-fade-in 0.2s ease forwards;
    }
  }

  @keyframes arrow-fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes stat-up {
    0% {
      color: var(--color-primary);
      text-shadow: none;
    }

    30% {
      color: #4ade80;
      text-shadow: 0 0 8px rgb(74 222 128 / 80%);
    }

    100% {
      color: var(--color-primary);
      text-shadow: none;
    }
  }
</style>

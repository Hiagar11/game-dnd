<template>
  <div class="stats-grid">
    <div v-for="row in STAT_ROWS" :key="row.primary.key" class="stats-grid__card">
      <!-- Шапка карточки: первичная характеристика -->
      <div class="stats-grid__card-header" :title="row.primary.hint">
        <component :is="row.primary.icon" :size="18" weight="bold" class="stats-grid__card-icon" />
        <span class="stats-grid__card-name">{{ row.primary.label }}</span>
        <div class="stats-grid__card-controls">
          <input
            :value="modelValue[row.primary.key]"
            type="number"
            min="0"
            class="stats-grid__input"
            @input="
              $emit('update:modelValue', { ...modelValue, [row.primary.key]: +$event.target.value })
            "
          />
          <button
            v-if="props.statPoints > 0"
            class="stats-grid__plus-btn"
            title="Потратить очко характеристик"
            @click="emit('spend-point', row.primary.key)"
          >
            +1
          </button>
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
      </div>

      <!-- Тело карточки: производные характеристики -->
      <div class="stats-grid__card-body">
        <div
          v-for="stat in row.derived"
          :key="stat.key"
          class="stats-grid__derived"
          :title="stat.hint"
        >
          <component :is="stat.icon" :size="14" class="stats-grid__derived-icon" />
          <span class="stats-grid__derived-name">{{ stat.label }}</span>
          <span
            class="stats-grid__derived-value"
            :class="{
              'stats-grid__derived-value--up': flashingKeys.has(stat.key),
              'stats-grid__derived-value--arrow': arrowKeys.has(stat.key),
            }"
          >
            {{ computeDerived(stat.key) }}
          </span>
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
    </div>
  </div>
</template>

<script setup>
  import { toRef } from 'vue'
  import { STAT_ROWS } from '../constants/tokenStatRows'
  import { useTokenGearBonuses } from '../composables/useTokenGearBonuses'
  import { useTokenDerivedStats } from '../composables/useTokenDerivedStats'
  import { useDerivedStatFlash } from '../composables/useDerivedStatFlash'

  const props = defineProps({
    modelValue: { type: Object, required: true },
    inventory: { type: Object, default: null },
    statPoints: { type: Number, default: 0 },
  })
  const emit = defineEmits(['update:modelValue', 'spend-point'])
  const modelValueRef = toRef(props, 'modelValue')
  const inventoryRef = toRef(props, 'inventory')

  const { totalStats, primaryBonus, directDerivedBonus } = useTokenGearBonuses({
    inventory: inventoryRef,
    modelValue: modelValueRef,
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
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }

  /* ── Карточка характеристики ──────────────────────────── */
  .stats-grid__card {
    display: flex;
    flex-direction: column;
    border: 1px solid rgb(255 255 255 / 8%);
    border-radius: var(--radius-md, 8px);
    background: rgb(255 255 255 / 3%);
    overflow: hidden;
    transition: border-color 0.2s;

    &:hover {
      border-color: rgb(255 255 255 / 15%);
    }
  }

  .stats-grid__card-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: rgb(255 255 255 / 4%);
    border-bottom: 1px solid rgb(255 255 255 / 6%);
  }

  .stats-grid__card-icon {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .stats-grid__card-name {
    font-size: 13px;
    font-family: var(--font-ui);
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
  }

  .stats-grid__card-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-left: auto;
  }

  .stats-grid__input {
    width: 3.2rem;
    padding: 2px var(--space-2);
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

  .stats-grid__plus-btn {
    padding: 1px 5px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border: none;
    border-radius: var(--radius-sm);
    color: #1a1200;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    animation: plus-btn-glow 1.5s ease-in-out infinite;
    transition: transform 0.15s;

    &:hover {
      transform: scale(1.15);
    }
  }

  @keyframes plus-btn-glow {
    0%,
    100% {
      box-shadow: 0 0 4px rgb(251 191 36 / 50%);
    }

    50% {
      box-shadow: 0 0 10px rgb(251 191 36 / 80%);
    }
  }

  /* ── Тело карточки: производные статы ───────────────── */
  .stats-grid__card-body {
    display: flex;
    flex-direction: column;
    padding: var(--space-2) var(--space-3);
    gap: var(--space-1);
  }

  .stats-grid__derived {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 2px 0;
  }

  .stats-grid__derived-icon {
    color: var(--color-text-muted);
    flex-shrink: 0;
    opacity: 0.6;
  }

  .stats-grid__derived-name {
    font-size: 12px;
    font-family: var(--font-ui);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .stats-grid__derived-value {
    margin-left: auto;
    font-size: 14px;
    font-family: var(--font-ui);
    font-weight: 600;
    color: var(--color-primary);
    transition: color 0.2s;
    min-width: 1.2rem;
    text-align: right;
  }

  /* ── Бонусы ─────────────────────────────────────────── */
  .stats-grid__bonus {
    font-size: 11px;
    font-family: var(--font-ui);
    font-weight: 700;
    min-width: 2rem;
    text-align: right;
  }

  .stats-grid__bonus--pos {
    color: #4ade80;
  }

  .stats-grid__bonus--neg {
    color: #f87171;
  }

  /* ── Анимации ───────────────────────────────────────── */
  .stats-grid__derived-value--up {
    animation: stat-up 0.6s ease forwards;
  }

  .stats-grid__derived-value--arrow {
    position: relative;

    &::after {
      content: '\25B2';
      position: absolute;
      top: -5px;
      right: -10px;
      font-size: 8px;
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

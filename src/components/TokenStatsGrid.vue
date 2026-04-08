<template>
  <div class="stats-grid">
    <div v-for="row in STAT_ROWS" :key="row.primary.key" class="stats-grid__row">
      <!-- Левая часть: иконка + название + инпут -->
      <label class="stats-grid__primary" :title="row.primary.hint">
        <span class="stats-grid__primary-name">
          <component :is="row.primary.icon" :size="18" weight="bold" />
          {{ row.primary.label }}
        </span>
        <input
          :value="modelValue[row.primary.key]"
          type="number"
          min="0"
          class="stats-grid__input"
          @input="
            $emit('update:modelValue', { ...modelValue, [row.primary.key]: +$event.target.value })
          "
        />
      </label>

      <!-- Разделитель -->
      <div class="stats-grid__sep" aria-hidden="true" />

      <!-- Правая часть: два пассивных навыка -->
      <div class="stats-grid__pair">
        <template v-for="(stat, idx) in row.derived" :key="stat.key">
          <div class="stats-grid__sep" aria-hidden="true" />
          <div class="stats-grid__derived" :title="stat.hint">
            <component :is="stat.icon" :size="15" />
            <span class="stats-grid__derived-name">{{ stat.label }}</span>
            <span class="stats-grid__derived-value">{{ computeDerived(stat.key) }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
  import {
    PhSword,
    PhFeather,
    PhBrain,
    PhStar,
    PhFlame,
    PhTarget,
    PhShield,
    PhShieldCheck,
    PhWind,
    PhLightning,
    PhMagicWand,
    PhChatTeardropText,
  } from '@phosphor-icons/vue'

  const props = defineProps({ modelValue: { type: Object, required: true } })
  defineEmits(['update:modelValue'])

  // Строки: первичная характеристика + два пассивных навыка
  const STAT_ROWS = [
    {
      primary: {
        key: 'strength',
        label: 'Сила',
        icon: PhSword,
        hint: 'Физическая мощь, тяжёлое оружие',
      },
      derived: [
        { key: 'damage', label: 'Урон', icon: PhFlame, hint: 'Сила ×2 + Ловкость' },
        { key: 'defense', label: 'Защита', icon: PhShield, hint: 'Сила + Ловкость' },
      ],
    },
    {
      primary: {
        key: 'agility',
        label: 'Ловкость',
        icon: PhFeather,
        hint: 'Скорость, точность движений, реакция',
      },
      derived: [
        { key: 'critChance', label: 'Шанс удара', icon: PhTarget, hint: 'Ловкость ×2 + Сила' },
        { key: 'evasion', label: 'Уклонение', icon: PhWind, hint: 'Ловкость ×3 + Сила' },
      ],
    },
    {
      primary: {
        key: 'intellect',
        label: 'Интеллект',
        icon: PhBrain,
        hint: 'Тактика, знание магии, концентрация',
      },
      derived: [
        { key: 'initiative', label: 'Инициатива', icon: PhLightning, hint: 'Ловкость + Интеллект' },
        { key: 'magicPower', label: 'Маг. сила', icon: PhMagicWand, hint: 'Интеллект ×2' },
      ],
    },
    {
      primary: {
        key: 'charisma',
        label: 'Харизма',
        icon: PhStar,
        hint: 'Воля, командный дух, устойчивость',
      },
      derived: [
        {
          key: 'persuasion',
          label: 'Убеждение',
          icon: PhChatTeardropText,
          hint: 'Харизма ×2 + Интеллект',
        },
        {
          key: 'resistance',
          label: 'Сопротивление',
          icon: PhShieldCheck,
          hint: 'Интеллект + Сила',
        },
      ],
    },
  ]

  function computeDerived(key) {
    const { strength: s = 0, agility: a = 0, intellect: i = 0, charisma: c = 0 } = props.modelValue
    switch (key) {
      case 'damage':
        return Math.floor((s * 2 + a) / 5)
      case 'critChance':
        return Math.floor((a * 2 + s) / 5)
      case 'defense':
        return Math.floor((s + a) / 4)
      case 'evasion':
        return Math.floor((a * 3 + s) / 5)
      case 'initiative':
        return Math.floor((a + i) / 2)
      case 'resistance':
        return Math.floor((i + s) / 3)
      case 'magicPower':
        return Math.floor((i * 2) / 3)
      case 'persuasion':
        return Math.floor((c * 2 + i) / 3)
      default:
        return 0
    }
  }
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
    margin-left: auto;
  }
</style>

<template>
  <div class="ability-tree">
    <!-- Счётчик очков активации -->
    <div class="ability-tree__header">
      <span class="ability-tree__points">
        <PhLightning :size="14" weight="fill" class="ability-tree__points-icon" />
        Очки активации:
        <strong>{{ usedActivationPoints }}</strong> / <strong>{{ totalActivationPoints }}</strong>
      </span>
      <span class="ability-tree__hint"> Нажмите на доступную способность, чтобы изучить </span>
    </div>

    <!-- Тиры сверху вниз (только с видимыми способностями) -->
    <div v-for="tierGroup in visibleTree" :key="tierGroup.tier" class="ability-tree__tier">
      <!-- Заголовок тира -->
      <div class="ability-tree__tier-header" :style="{ '--tier-color': tierColor(tierGroup.tier) }">
        <span class="ability-tree__tier-line" />
        <span class="ability-tree__tier-label">{{ tierLabel(tierGroup.tier) }}</span>
        <span class="ability-tree__tier-line" />
      </div>

      <!-- Карточки способностей -->
      <div class="ability-tree__grid">
        <div
          v-for="ability in tierGroup.abilities"
          :key="ability.id"
          class="ability-tree__card"
          :class="[
            `ability-tree__card--${ability.status}`,
            { 'ability-tree__card--passive': ability.type === 'passive' },
            { 'ability-tree__card--synergy': ability.tier === 'S' },
            { 'ability-tree__card--burst': burstCardId === ability.id },
          ]"
          :style="{ '--ability-color': ability.color }"
          :title="cardTooltip(ability)"
          @click="onCardClick(ability)"
        >
          <!-- Иконка -->
          <span class="ability-tree__card-icon" :style="abilityIconStyle(ability)" />

          <!-- Инфо -->
          <div class="ability-tree__card-info">
            <span class="ability-tree__card-name">{{ ability.name }}</span>
            <span class="ability-tree__card-desc">{{ ability.description }}</span>
          </div>

          <!-- Теги -->
          <div class="ability-tree__card-tags">
            <span v-if="ability.apCost" class="ability-tree__tag ability-tree__tag--ap">
              {{ ability.apCost }} AP
            </span>
            <span v-else class="ability-tree__tag ability-tree__tag--passive"> PASS </span>
            <span class="ability-tree__tag ability-tree__tag--req">
              {{ formatRequirements(ability) }}
            </span>
          </div>

          <!-- Статус-бейдж -->
          <span class="ability-tree__card-badge">
            <PhLockOpen v-if="ability.status === 'available'" :size="14" weight="bold" />
            <PhCheck v-else :size="14" weight="bold" />
          </span>

          <!-- Пререквизиты для синергий -->
          <div v-if="ability.requiredAbilities.length" class="ability-tree__card-prereqs">
            <span class="ability-tree__prereq-label">Требует:</span>
            <span
              v-for="reqId in ability.requiredAbilities"
              :key="reqId"
              class="ability-tree__prereq-tag"
              :class="{ 'ability-tree__prereq-tag--met': isActivated(reqId) }"
            >
              {{ getAbilityName(reqId) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { PhLightning, PhLockOpen, PhCheck } from '@phosphor-icons/vue'
  import { useAbilityTree } from '../composables/useAbilityTree'
  import { TIER_LABELS, TIER_COLORS, getAbilityTreeById } from '../constants/abilityTree'

  const props = defineProps({
    stats: { type: Object, required: true },
    activatedAbilityIds: { type: Array, default: () => [] },
    activationPoints: { type: Number, default: 0 },
  })

  const emit = defineEmits(['activate', 'deactivate'])

  // Реактивные обёртки для composable
  const statsRef = computed(() => props.stats)
  const activatedIdsRef = computed(() => props.activatedAbilityIds)

  const { visibleTree, usedActivationPoints, formatRequirements } = useAbilityTree(
    statsRef,
    activatedIdsRef
  )

  const totalActivationPoints = computed(() => props.activationPoints)
  const remainingPoints = computed(() => totalActivationPoints.value - usedActivationPoints.value)

  // Анимация покупки — id карточки, на которой проигрывается вспышка
  const burstCardId = ref(null)

  function tierLabel(tier) {
    return TIER_LABELS[tier] ?? `Тир ${tier}`
  }

  function tierColor(tier) {
    return TIER_COLORS[tier] ?? '#888'
  }

  function isActivated(id) {
    return props.activatedAbilityIds.includes(id)
  }

  function getAbilityName(id) {
    return getAbilityTreeById(id)?.name ?? id
  }

  function abilityIconStyle(ability) {
    if (!ability?.icon) return {}
    const url = `https://api.iconify.design/game-icons/${ability.icon}.svg`
    return { maskImage: `url('${url}')`, backgroundColor: ability.color || '#e2e8f0' }
  }

  function cardTooltip(ability) {
    if (ability.status === 'activated') return `${ability.name} — активирована (нажми чтобы снять)`
    return `${ability.name} — доступна для изучения`
  }

  function onCardClick(ability) {
    if (ability.status === 'activated') {
      emit('deactivate', ability.id)
      return
    }
    if (ability.status === 'available' && remainingPoints.value > 0) {
      // Запускаем анимацию вспышки
      burstCardId.value = ability.id
      emit('activate', ability.id)

      // Сбрасываем класс после окончания анимации
      setTimeout(() => {
        burstCardId.value = null
      }, 700)
    }
  }
</script>

<style scoped lang="scss">
  .ability-tree {
    padding: var(--space-2) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-height: 520px;
    overflow-y: auto;

    // Тонкий скроллбар
    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgb(255 255 255 / 15%);
      border-radius: 4px;
    }
  }

  // ── Заголовок с очками ──────────────────────────────────────
  .ability-tree__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-2);
  }

  .ability-tree__points {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--color-primary);

    strong {
      color: #fff;
    }
  }

  .ability-tree__points-icon {
    color: var(--color-primary);
  }

  .ability-tree__hint {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--color-text-muted);
  }

  // ── Тир ─────────────────────────────────────────────────────
  .ability-tree__tier-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-2);
  }

  .ability-tree__tier-line {
    flex: 1;
    height: 1px;
    background: var(--tier-color, var(--color-border));
    opacity: 0.4;
  }

  .ability-tree__tier-label {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tier-color, var(--color-text-muted));
    white-space: nowrap;
  }

  // ── Сетка карточек ──────────────────────────────────────────
  .ability-tree__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 6px;
    padding: 0 var(--space-2);
  }

  // ── Карточка способности ────────────────────────────────────
  .ability-tree__card {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgb(255 255 255 / 10%);
    background: rgb(0 0 0 / 30%);
    cursor: default;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast),
      opacity var(--transition-fast);

    // ── Доступна ──
    &--available {
      border-color: var(--ability-color, var(--color-primary));
      cursor: pointer;

      &:hover {
        background: rgb(255 255 255 / 6%);
        border-color: var(--ability-color, var(--color-primary));
        box-shadow: 0 0 12px rgb(255 255 255 / 8%);
      }
    }

    // ── Активирована ──
    &--activated {
      border-color: var(--ability-color, var(--color-primary));
      background: color-mix(in srgb, var(--ability-color, #888) 12%, transparent);
      cursor: pointer;

      .ability-tree__card-badge {
        color: #4ade80;
      }
    }

    // ── Синергия ──
    &--synergy {
      border-style: dashed;
    }
  }

  // ── Иконка ──────────────────────────────────────────────────
  .ability-tree__card-icon {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
  }

  // ── Инфо ────────────────────────────────────────────────────
  .ability-tree__card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ability-tree__card-name {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ability-tree__card-desc {
    font-family: var(--font-ui);
    font-size: 10px;
    color: var(--color-text-muted);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  // ── Теги (AP, статы) ────────────────────────────────────────
  .ability-tree__card-tags {
    display: flex;
    gap: 4px;
    width: 100%;
  }

  .ability-tree__tag {
    font-family: var(--font-ui);
    font-size: 9px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgb(255 255 255 / 8%);
    color: var(--color-text-muted);

    &--ap {
      color: #fbbf24;
    }

    &--passive {
      color: #60a5fa;
    }

    &--req {
      margin-left: auto;
    }
  }

  // ── Бейдж статуса ───────────────────────────────────────────
  .ability-tree__card-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    color: var(--color-text-muted);
    line-height: 1;

    .ability-tree__card--available & {
      color: var(--ability-color, var(--color-primary));
    }
  }

  // ── Пререквизиты (синергии) ─────────────────────────────────
  .ability-tree__card-prereqs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding-top: 4px;
    border-top: 1px solid rgb(255 255 255 / 6%);
  }

  .ability-tree__prereq-label {
    font-family: var(--font-ui);
    font-size: 9px;
    color: var(--color-text-muted);
  }

  .ability-tree__prereq-tag {
    font-family: var(--font-ui);
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgb(255 255 255 / 6%);
    color: #f87171;

    &--met {
      color: #4ade80;
    }
  }

  // ── Анимация покупки (вспышка искр) ─────────────────────────
  .ability-tree__card--burst {
    animation: ability-burst 0.65s ease-out;
  }

  @keyframes ability-burst {
    0% {
      box-shadow:
        0 0 0 0 var(--ability-color, #fbbf24),
        0 0 0 0 rgb(255 255 255 / 40%);
    }

    30% {
      box-shadow:
        0 0 18px 6px var(--ability-color, #fbbf24),
        0 0 40px 10px rgb(255 255 255 / 20%);
      border-color: #fff;
      background: color-mix(in srgb, var(--ability-color, #fbbf24) 25%, transparent);
    }

    100% {
      box-shadow:
        0 0 0 0 transparent,
        0 0 0 0 transparent;
    }
  }
</style>

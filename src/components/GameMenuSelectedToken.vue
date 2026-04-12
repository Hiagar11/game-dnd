<template>
  <Transition name="token-info" appear>
    <div v-if="placed" class="token-info">
      <!-- Строка 1: Имя | HP -->
      <div class="token-info__row">
        <span class="token-info__name">{{ placed.name }}</span>
        <div class="token-info__hp">
          <PhHeart :size="15" weight="fill" class="token-info__hp-icon" />
          <span class="token-info__hp-text"
            >{{ placed.hp ?? placed.maxHp ?? 10 }}/{{ placed.maxHp ?? 10 }}</span
          >
          <div class="token-info__hp-bar">
            <div class="token-info__hp-fill" :style="{ width: `${hpPercent}%` }" />
          </div>
        </div>
      </div>

      <!-- Строка 2: Уровень | XP -->
      <div class="token-info__row">
        <span class="token-info__level">Ур. {{ level }}</span>
        <div class="token-info__xp">
          <PhStar :size="11" weight="fill" class="token-info__xp-icon" />
          <div class="token-info__xp-bar">
            <div class="token-info__xp-fill" :style="{ width: `${xpPercent}%` }" />
          </div>
        </div>
      </div>

      <!-- Строка 3: Очки действия -->
      <div class="token-info__row">
        <PhLightning :size="11" weight="fill" class="token-info__ap-icon" />
        <TransitionGroup name="ap-dot" tag="div" class="token-info__ap">
          <span v-for="i in placed.actionPoints ?? 4" :key="i" class="token-info__ap-dot" />
        </TransitionGroup>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { computed } from 'vue'
  import { PhHeart, PhStar, PhLightning } from '@phosphor-icons/vue'
  import { useGameStore } from '../stores/game'
  import { hpPercentFromValues } from '../utils/hp'
  import { getSelectedNonSystemToken } from '../utils/tokenFilters'
  import { xpProgressPercent } from '../utils/xpFormula'

  const store = useGameStore()

  const placed = computed(() => {
    if (!store.selectedPlacedUid) return null
    return getSelectedNonSystemToken(store.placedTokens, store.selectedPlacedUid)
  })

  // Уровень и XP берём из placed-токена (маппятся с шаблона через mapServerToken)
  const level = computed(() => placed.value?.level ?? 1)

  const xpPercent = computed(() => {
    if (!placed.value) return 0
    return xpProgressPercent(placed.value.xp ?? 0, level.value)
  })

  const hpPercent = computed(() => {
    if (!placed.value) return 100
    const hp = placed.value.hp ?? placed.value.maxHp ?? 10
    const max = placed.value.maxHp ?? 10
    return hpPercentFromValues(hp, max)
  })
</script>

<style scoped src="../assets/styles/components/gameMenuSelectedToken.css"></style>

<template>
  <Transition name="token-info" appear>
    <div v-if="placed" class="token-info">
      <!-- Строка 1: Класс героя | HP -->
      <div class="token-info__row">
        <span
          class="token-info__name"
          :class="{ 'token-info__name--synergy': heroClassInfo.synergy }"
          :style="{ color: heroClassInfo.color }"
        >
          {{ heroClassInfo.name }}
        </span>
        <div class="token-info__hp">
          <PhHeart :size="15" weight="fill" class="token-info__hp-icon" />
          <span v-if="raceName" class="token-info__race">{{ raceName }}</span>
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

      <!-- Строка 3: Очки действия (AP) -->
      <div class="token-info__row">
        <PhLightning :size="11" weight="fill" class="token-info__ap-icon" />
        <TransitionGroup name="ap-dot" tag="div" class="token-info__ap">
          <span
            v-for="i in displayAp"
            :key="'ap' + i"
            class="token-info__ap-dot"
            :class="{
              'token-info__ap-dot--used': i > currentActionPoints,
              'token-info__ap-dot--ap-bonus': i > currentBaseAp,
            }"
          />
        </TransitionGroup>
      </div>

      <!-- Строка 3b: Очки передвижения (MP) -->
      <div class="token-info__row">
        <PhSneakerMove :size="11" weight="fill" class="token-info__mp-icon" />
        <TransitionGroup name="ap-dot" tag="div" class="token-info__ap">
          <span
            v-for="i in displayMp"
            :key="'mp' + i"
            class="token-info__ap-dot token-info__ap-dot--mp"
            :class="{
              'token-info__ap-dot--used': i > (placed.movementPoints ?? DEFAULT_MP),
              'token-info__ap-dot--mp-bonus': i > DEFAULT_MP,
            }"
          />
        </TransitionGroup>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { computed } from 'vue'
  import { PhHeart, PhStar, PhLightning, PhSneakerMove } from '@phosphor-icons/vue'
  import { useGameStore } from '../stores/game'
  import { DEFAULT_MP } from '../constants/combat'
  import { getBaseActionPoints } from '../utils/actionPoints'
  import { hpPercentFromValues } from '../utils/hp'
  import { getSelectedNonSystemToken } from '../utils/tokenFilters'
  import { xpProgressPercent } from '../utils/xpFormula'
  import { getRaceById } from '../constants/races'
  import { getHeroClass } from '../constants/heroClass'

  const store = useGameStore()

  const placed = computed(() => {
    if (!store.selectedPlacedUid) return null
    return getSelectedNonSystemToken(store.placedTokens, store.selectedPlacedUid)
  })

  // Уровень и XP берём из placed-токена (маппятся с шаблона через mapServerToken)
  const level = computed(() => placed.value?.level ?? 1)

  const raceName = computed(() => {
    if (!placed.value?.race) return null
    return getRaceById(placed.value.race)?.label ?? null
  })

  // Класс героя на основе статов и открытых синергий
  const heroClassInfo = computed(() => {
    if (!placed.value) return { name: '', color: '#6b7280', synergy: false }
    return getHeroClass(placed.value, placed.value.treeActivatedIds ?? [])
  })

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

  const currentBaseAp = computed(() => {
    if (!placed.value) return 2
    return getBaseActionPoints(placed.value)
  })

  const currentActionPoints = computed(() => {
    if (!placed.value) return 0
    return placed.value.actionPoints ?? 0
  })

  // Показываем бонусные точки AP выше базового AP токена (например после Воодушевления)
  const displayAp = computed(() => {
    if (!placed.value) return 2
    return Math.max(
      currentBaseAp.value,
      currentActionPoints.value,
      currentBaseAp.value + (placed.value.bonusAp ?? 0)
    )
  })

  // Показываем бонусные точки MP выше DEFAULT_MP (например после Быстрого шага)
  const displayMp = computed(() => {
    if (!placed.value) return DEFAULT_MP
    return Math.max(DEFAULT_MP, placed.value.movementPoints ?? 0)
  })
</script>

<style scoped src="../assets/styles/components/gameMenuSelectedToken.css"></style>

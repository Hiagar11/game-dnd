<template>
  <Transition name="token-info" appear>
    <div v-if="placed" class="token-info">
      <!-- Строка 1: Имя | HP -->
      <div class="token-info__row">
        <span class="token-info__name">{{ placed.name }}</span>
        <div class="token-info__hp">
          <PhHeart :size="11" weight="fill" class="token-info__hp-icon" />
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
  import { xpProgressPercent } from '../utils/xpFormula'

  const store = useGameStore()

  const placed = computed(() => {
    if (!store.selectedPlacedUid) return null
    const t = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    return t && !t.systemToken ? t : null
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
    return max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 100
  })
</script>

<style scoped>
  .token-info {
    background-image: url('/systemImage/panel-center.jpg');
    background-size: cover;
    border-right: 1px solid rgb(255 255 255 / 10%);
    padding: 38px 12px 8px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 7px;
    overflow: hidden;
    height: 100%;
    box-sizing: border-box;
  }

  /* ── Строки ── */
  .token-info__row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .token-info__name {
    font-size: 13px;
    font-weight: 700;
    color: rgb(255 255 255 / 90%);
    font-family: var(--font-ui);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .token-info__level {
    font-size: 11px;
    font-weight: 600;
    color: rgb(250 204 21 / 85%);
    font-family: var(--font-ui);
    letter-spacing: 0.04em;
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 36px;
  }

  /* ── HP ── */
  .token-info__hp {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .token-info__hp-icon {
    color: #f87171;
    flex-shrink: 0;
  }

  .token-info__hp-text {
    font-size: 11px;
    font-weight: 600;
    color: rgb(255 255 255 / 65%);
    font-family: var(--font-ui);
    white-space: nowrap;
  }

  .token-info__hp-bar {
    width: 80px;
    height: 5px;
    background: rgb(255 255 255 / 10%);
    border-radius: 3px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .token-info__hp-fill {
    height: 100%;
    background: linear-gradient(90deg, #ef4444, #f87171);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  /* ── XP ── */
  .token-info__xp {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
  }

  .token-info__xp-icon {
    color: rgb(250 204 21 / 70%);
    flex-shrink: 0;
  }

  .token-info__xp-bar {
    flex: 1;
    height: 4px;
    background: rgb(255 255 255 / 10%);
    border-radius: 3px;
    overflow: hidden;
  }

  .token-info__xp-fill {
    height: 100%;
    background: linear-gradient(90deg, rgb(234 179 8), rgb(250 204 21));
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  /* ── AP ── */
  .token-info__ap-icon {
    color: rgb(250 204 21 / 80%);
    flex-shrink: 0;
  }

  .token-info__ap {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .token-info__ap-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgb(250 204 21 / 70%);
    flex-shrink: 0;
  }

  /* Анимация исчезновения точки AP */
  .ap-dot-leave-active {
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
    position: relative;
  }

  .ap-dot-leave-to {
    opacity: 0;
    transform: scale(0);
  }

  /* ── Анимация появления ── */
  .token-info-enter-active {
    animation: info-slide-in 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .token-info-leave-active {
    animation: info-slide-in 0.15s ease-in reverse;
  }

  @keyframes info-slide-in {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

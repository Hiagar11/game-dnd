<template>
  <Transition name="combat-popup">
    <div v-if="visible && heroToken && npcToken" class="combat-popup-wrapper">
      <Transition name="result-banner">
        <div
          v-if="resultText"
          class="combat-popup__banner"
          :class="`combat-popup__banner--${resultType}`"
        >
          {{ resultText }}
        </div>
      </Transition>

      <div class="combat-popup" :class="phaseClass">
        <div class="combat-popup__side combat-popup__side--attacker">
          <div class="combat-popup__header">Атакующий</div>

          <div class="combat-popup__avatar-wrap">
            <img
              :src="currentAttacker.src"
              :alt="currentAttacker.name"
              class="combat-popup__avatar"
            />
          </div>
          <div class="combat-popup__name">{{ currentAttacker.name }}</div>

          <div class="combat-popup__hp-number">
            <PhHeart :size="14" weight="fill" class="combat-popup__stat-icon--hp" />
            <span class="combat-popup__hp-current">{{ currentAttacker.hp }}</span>
            <span class="combat-popup__hp-sep">/</span>
            <span class="combat-popup__hp-max">{{ currentAttacker.maxHp }}</span>
          </div>
          <div class="combat-popup__hp-bar-wrap">
            <div class="combat-popup__hp-bar">
              <div
                class="combat-popup__hp-fill"
                :style="{ width: `${hpPercent(currentAttacker)}%` }"
              />
            </div>
          </div>

          <div class="combat-popup__stat">
            <PhLightning
              :size="16"
              weight="fill"
              class="combat-popup__stat-icon combat-popup__stat-icon--ap"
            />
            <div class="combat-popup__ap-dots">
              <span
                v-for="i in DEFAULT_AP"
                :key="i"
                class="combat-popup__ap-dot"
                :class="{
                  'combat-popup__ap-dot--used': i > (currentAttacker.actionPoints ?? DEFAULT_AP),
                }"
              />
            </div>
            <span class="combat-popup__stat-value">{{
              currentAttacker.actionPoints ?? DEFAULT_AP
            }}</span>
          </div>

          <div class="combat-popup__combat-stats">
            <div class="combat-popup__csrow">
              <span class="combat-popup__cslabel">Шанс удара</span>
              <span class="combat-popup__csval">+{{ calcCritChance(currentAttacker) }}</span>
            </div>
            <div class="combat-popup__csrow">
              <span class="combat-popup__cslabel">Бонус урона</span>
              <span class="combat-popup__csval">+{{ calcDamageBonus(currentAttacker) }}</span>
            </div>
          </div>

          <div class="combat-popup__actions">
            <div class="combat-popup__actions-title">Действия</div>
            <button
              class="combat-popup__action"
              :disabled="phase !== 'idle' || (currentAttacker.actionPoints ?? 0) <= 0"
              @click="onPunch(npcIsAttacking)"
            >
              <PhHandFist :size="18" weight="bold" />
              <span>Удар рукой</span>
            </button>
          </div>
        </div>

        <div class="combat-popup__divider">
          <div v-if="phase !== 'idle'" class="combat-popup__roll-area">
            <template v-if="phase === 'rolling-hit' || phase === 'hit' || phase === 'miss'">
              <div
                class="combat-popup__die"
                :class="{ 'combat-popup__die--rolling': phase === 'rolling-hit' }"
              >
                <span class="combat-popup__die-face">d20</span>
                <span class="combat-popup__die-num">
                  {{ phase === 'rolling-hit' ? rollingNumber : hitRoll?.d20 }}
                </span>
              </div>
              <div v-if="phase !== 'rolling-hit'" class="combat-popup__roll-formula">
                {{ hitRoll?.d20 }} + {{ hitRoll?.bonus }} = {{ hitRoll?.total }}
              </div>
            </template>

            <template v-if="phase === 'rolling-damage' || phase === 'done'">
              <div
                class="combat-popup__die combat-popup__die--damage"
                :class="{ 'combat-popup__die--rolling': phase === 'rolling-damage' }"
              >
                <span class="combat-popup__die-face">d4</span>
                <span class="combat-popup__die-num">
                  {{ phase === 'rolling-damage' ? rollingNumber : damageRoll?.d4 }}
                </span>
              </div>
              <div
                v-if="phase === 'done'"
                class="combat-popup__roll-formula combat-popup__roll-formula--damage"
              >
                {{ damageRoll?.d4 }} + {{ damageRoll?.bonus }} =
                <strong>{{ damageRoll?.total }}</strong>
              </div>
            </template>
          </div>

          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 40 40">
            <g transform="rotate(-45 20 20)" opacity="0.95">
              <rect x="18.5" y="4" width="3" height="22" rx="1" fill="#f87171" />
              <rect x="14" y="10" width="12" height="2.5" rx="1" fill="#fca5a5" />
              <polygon points="20,2 18,6 22,6" fill="#fca5a5" />
            </g>
            <g transform="rotate(45 20 20)" opacity="0.85">
              <rect x="18.5" y="4" width="3" height="22" rx="1" fill="#f87171" />
              <rect x="14" y="10" width="12" height="2.5" rx="1" fill="#fca5a5" />
              <polygon points="20,2 18,6 22,6" fill="#fca5a5" />
            </g>
          </svg>
        </div>

        <div class="combat-popup__side combat-popup__side--defender">
          <div class="combat-popup__header">Защищающийся</div>

          <div
            class="combat-popup__avatar-wrap"
            :class="{
              'combat-popup__avatar-wrap--hit': phase === 'hit' || phase === 'rolling-damage',
              'combat-popup__avatar-wrap--done': phase === 'done',
              'combat-popup__avatar-wrap--miss': phase === 'miss',
            }"
          >
            <img
              :src="currentDefender.src"
              :alt="currentDefender.name"
              class="combat-popup__avatar"
            />
          </div>
          <div class="combat-popup__name">{{ currentDefender.name }}</div>

          <div class="combat-popup__hp-number">
            <PhHeart :size="14" weight="fill" class="combat-popup__stat-icon--hp" />
            <span class="combat-popup__hp-current">{{ currentDefender.hp }}</span>
            <span class="combat-popup__hp-sep">/</span>
            <span class="combat-popup__hp-max">{{ currentDefender.maxHp }}</span>
          </div>
          <div class="combat-popup__hp-bar-wrap">
            <div class="combat-popup__hp-bar">
              <div
                class="combat-popup__hp-fill"
                :style="{ width: `${hpPercent(currentDefender)}%` }"
              />
            </div>
          </div>

          <div class="combat-popup__stat">
            <PhLightning
              :size="16"
              weight="fill"
              class="combat-popup__stat-icon combat-popup__stat-icon--ap"
            />
            <div class="combat-popup__ap-dots">
              <span
                v-for="i in DEFAULT_AP"
                :key="i"
                class="combat-popup__ap-dot"
                :class="{
                  'combat-popup__ap-dot--used': i > (currentDefender.actionPoints ?? DEFAULT_AP),
                }"
              />
            </div>
            <span class="combat-popup__stat-value">{{
              currentDefender.actionPoints ?? DEFAULT_AP
            }}</span>
          </div>

          <div class="combat-popup__combat-stats">
            <div class="combat-popup__csrow">
              <span class="combat-popup__cslabel">Уклонение</span>
              <span class="combat-popup__csval">{{ calcEvasion(currentDefender) }}</span>
            </div>
            <div class="combat-popup__csrow">
              <span class="combat-popup__cslabel">Защита</span>
              <span class="combat-popup__csval">{{ calcDefense(currentDefender) }}</span>
            </div>
          </div>
        </div>

        <button class="combat-popup__close" @click="onClose">
          <PhX :size="18" weight="bold" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { computed } from 'vue'
  import { PhHeart, PhLightning, PhHandFist, PhX } from '@phosphor-icons/vue'
  import { useGameStore } from '../stores/game'
  import {
    calcCritChance,
    calcDamageBonus,
    calcDefense,
    calcEvasion,
  } from '../utils/combatFormulas'
  import { useCombatLogic } from '../composables/useCombatLogic'

  defineProps({ visible: { type: Boolean, default: false } })

  const emit = defineEmits(['close'])
  const store = useGameStore()

  const heroToken = computed(() =>
    store.combatPair ? store.placedTokens.find((t) => t.uid === store.combatPair.heroUid) : null
  )
  const npcToken = computed(() =>
    store.combatPair ? store.placedTokens.find((t) => t.uid === store.combatPair.npcUid) : null
  )

  const {
    DEFAULT_AP,
    phase,
    hitRoll,
    damageRoll,
    rollingNumber,
    npcIsAttacking,
    currentAttacker,
    currentDefender,
    phaseClass,
    resultText,
    resultType,
    hpPercent,
    onPunch,
    onClose,
  } = useCombatLogic({ store, heroToken, npcToken, emitClose: () => emit('close') })
</script>
<style scoped lang="scss" src="../assets/styles/components/gameCombatPopup.scss"></style>

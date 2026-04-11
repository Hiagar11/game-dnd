<template>
  <Transition name="combat-popup">
    <div v-if="visible && heroToken && npcToken" class="combat-popup-wrapper">
      <!-- Баннер результата — над рамкой попапа -->
      <Transition name="result-banner">
        <div
          v-if="resultText"
          class="combat-popup__banner"
          :class="`combat-popup__banner--${resultType}`"
        >
          {{ resultText }}
        </div>
      </Transition>

      <!-- Сам попап -->
      <div class="combat-popup" :class="phaseClass">
        <!-- ── Атакующий ─────────────────────────────────────────────────── -->
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

          <!-- Боевые характеристики героя -->
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

        <!-- ── Разделитель ─────────────────────────────────────────────── -->
        <div class="combat-popup__divider">
          <!-- Область бросков кубиков -->
          <div v-if="phase !== 'idle'" class="combat-popup__roll-area">
            <!-- d20 бросок на попадание -->
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

            <!-- d4 бросок урона -->
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

          <!-- Иконка мечей -->
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

        <!-- ── Защищающийся ───────────────────────────────────────────── -->
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

          <!-- Боевые характеристики защищающегося -->
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

        <!-- Кнопка закрытия -->
        <button class="combat-popup__close" @click="onClose">
          <PhX :size="18" weight="bold" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { computed, ref, watch, onBeforeUnmount } from 'vue'
  import { PhHeart, PhLightning, PhHandFist, PhX } from '@phosphor-icons/vue'
  import { useGameStore } from '../stores/game'
  import { playSuccess, playFist } from '../composables/useSound'

  const props = defineProps({
    visible: { type: Boolean, default: false },
  })

  const emit = defineEmits(['close'])

  const store = useGameStore()
  const DEFAULT_AP = 4

  // Сложность броска на попадание (d20 + critChance >= HIT_DC → попал)
  const HIT_DC = 10

  // ── Вторичные характеристики (по формулам из модели) ─────────────────────────
  function calcCritChance(t) {
    return Math.floor(((t?.agility ?? 0) * 2 + (t?.strength ?? 0)) / 5)
  }
  function calcDamageBonus(t) {
    return Math.floor(((t?.strength ?? 0) * 2 + (t?.agility ?? 0)) / 5)
  }
  function calcEvasion(t) {
    return Math.floor(((t?.agility ?? 0) * 3 + (t?.strength ?? 0)) / 5)
  }
  function calcDefense(t) {
    return Math.floor(((t?.strength ?? 0) + (t?.agility ?? 0)) / 4)
  }

  const heroToken = computed(() => {
    if (!store.combatPair) return null
    return store.placedTokens.find((t) => t.uid === store.combatPair.heroUid)
  })

  const npcToken = computed(() => {
    if (!store.combatPair) return null
    return store.placedTokens.find((t) => t.uid === store.combatPair.npcUid)
  })

  // Атакующий и защищающийся — всегда слева и справа соответственно
  const currentAttacker = computed(() => (npcIsAttacking.value ? npcToken.value : heroToken.value))
  const currentDefender = computed(() => (npcIsAttacking.value ? heroToken.value : npcToken.value))

  function hpPercent(token) {
    if (!token?.maxHp) return 100
    return Math.max(0, Math.min(100, (token.hp / token.maxHp) * 100))
  }

  // ── Боевая система ────────────────────────────────────────────────────────────
  // Фазы: 'idle' | 'rolling-hit' | 'hit' | 'miss' | 'rolling-damage' | 'done'
  const phase = ref('idle')
  const hitRoll = ref(null) // { d20, bonus, total }
  const damageRoll = ref(null) // { d4, bonus, total }
  const rollingNumber = ref(1)
  const npcIsAttacking = ref(false)

  // Счётчик поколений: увеличивается при каждом прерывании боя.
  // onPunch сравнивает свой поколений-снимок с текущим — если не совпадает, прерывается.
  let punchGen = 0

  // Когда открывается новый бой (или бой прерывается) — сбрасываем состояние
  watch(
    () => store.combatPair,
    (pair) => {
      punchGen++ // прерываем любой текущий onPunch
      stopRolling()
      if (pair) {
        // Новый бой — начинаем чисто
        phase.value = 'idle'
        hitRoll.value = null
        damageRoll.value = null
      }
      npcIsAttacking.value = pair?.npcInitiated ?? false
    }
  )

  let rollingInterval = null

  function startRolling(sides) {
    rollingInterval = setInterval(() => {
      rollingNumber.value = Math.floor(Math.random() * sides) + 1
    }, 60)
  }

  function stopRolling() {
    if (rollingInterval) {
      clearInterval(rollingInterval)
      rollingInterval = null
    }
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms))
  }

  async function onPunch(asNpc = false) {
    if (phase.value !== 'idle' || !heroToken.value || !npcToken.value) return
    npcIsAttacking.value = asNpc
    const attackerToken = asNpc ? npcToken.value : heroToken.value
    const defenderToken = asNpc ? heroToken.value : npcToken.value

    // Удар стоит 1 AP; если очков нет — атака невозможна
    if (!store.spendActionPoint(attackerToken.uid)) return

    const myGen = ++punchGen // захватываем поколение для этого удара

    // ── Фаза 1: бросок на попадание (d20 + critChance) ───────────────────────
    phase.value = 'rolling-hit'
    startRolling(20)
    await delay(700)
    if (punchGen !== myGen) return // прервано внешним событием
    stopRolling()

    const d20 = Math.floor(Math.random() * 20) + 1
    const bonus = calcCritChance(attackerToken)
    const total = d20 + bonus
    hitRoll.value = { d20, bonus, total }

    if (total >= HIT_DC) {
      // Попал → красная рамка + «Успех!»
      phase.value = 'hit'
      playSuccess()
      await delay(1500)
      if (punchGen !== myGen) return

      // ── Фаза 2: бросок урона (d4 + damageBonus) ─────────────────────────
      phase.value = 'rolling-damage'
      startRolling(4)
      await delay(700)
      if (punchGen !== myGen) return
      stopRolling()

      const d4 = Math.floor(Math.random() * 4) + 1
      const dmgBonus = calcDamageBonus(attackerToken)
      const dmgTotal = d4 + dmgBonus
      damageRoll.value = { d4, bonus: dmgBonus, total: dmgTotal }

      // Применяем урон защищающемуся (re-read живое значение)
      const liveDefender = asNpc ? heroToken.value : npcToken.value
      if (liveDefender) {
        const newHp = Math.max(0, (liveDefender.hp ?? 0) - dmgTotal)
        store.editPlacedToken(liveDefender.uid, { hp: newHp })
      }
      playFist()

      phase.value = 'done'

      // Если у атакующего не осталось очков действий — заканчиваем ход автоматически
      await delay(2000)
      if (punchGen !== myGen) return
      if ((currentAttacker.value?.actionPoints ?? 0) <= 0) {
        resetPhase()
        store.endTurn()
        emit('close')
      } else {
        // AP ещё есть — сбрасываем фазу, кнопка снова активна
        resetPhase()
      }
    } else {
      // Промахнулся — промах заканчивает ход атакующего
      phase.value = 'miss'
      await delay(2000)
      if (punchGen !== myGen) return
      resetPhase()
      store.endTurn()
      emit('close')
    }
  }

  function resetPhase() {
    phase.value = 'idle'
    hitRoll.value = null
    damageRoll.value = null
  }

  function onClose() {
    punchGen++ // прерываем текущий onPunch если идёт
    stopRolling()
    resetPhase()
    emit('close')
  }

  onBeforeUnmount(() => {
    punchGen++
    stopRolling()
  })

  // ── Классы фаз ───────────────────────────────────────────────────────────────
  const phaseClass = computed(() => ({
    'combat-popup--hit': phase.value === 'hit' || phase.value === 'rolling-damage',
    'combat-popup--done': phase.value === 'done',
    'combat-popup--miss': phase.value === 'miss',
  }))

  // ── Текст баннера ─────────────────────────────────────────────────────────────
  const resultText = computed(() => {
    if (phase.value === 'hit' || phase.value === 'rolling-damage') return 'Успех!'
    if (phase.value === 'done') return `${damageRoll.value?.total} урона!`
    if (phase.value === 'miss') return 'Промах!'
    return null
  })

  const resultType = computed(() => {
    if (phase.value === 'miss') return 'miss'
    if (phase.value === 'done') return 'damage'
    return 'hit'
  })
</script>

<style scoped>
  /* ── Обёртка: позиционирует банер + попап как колонку по центру экрана ──── */
  .combat-popup-wrapper {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  /* ── Баннер результата (над рамкой) ──────────────────────────────────────── */
  .combat-popup__banner {
    font-family: var(--font-ui);
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-shadow: 0 0 20px currentcolor;
  }

  .combat-popup__banner--hit {
    color: rgb(250 200 60);
    animation: banner-pulse 0.6s ease-out;
  }

  .combat-popup__banner--miss {
    color: rgb(240 80 80);
    animation: banner-pulse 0.6s ease-out;
  }

  .combat-popup__banner--damage {
    color: rgb(250 140 60);
    animation: banner-pulse 0.6s ease-out;
  }

  @keyframes banner-pulse {
    0% {
      opacity: 0;
      transform: scale(0.6) translateY(8px);
    }

    60% {
      transform: scale(1.08) translateY(0);
    }

    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .result-banner-enter-active {
    animation: banner-pulse 0.4s ease-out;
  }

  .result-banner-leave-active {
    transition: opacity 0.3s ease;
  }

  .result-banner-leave-to {
    opacity: 0;
  }

  /* ── Попап ───────────────────────────────────────────────────────────────── */
  .combat-popup {
    display: flex;
    align-items: flex-start;
    gap: 0;
    font-family: var(--font-ui);
    background: rgb(15 15 20 / 95%);
    border: 1px solid rgb(255 255 255 / 12%);
    border-radius: 16px;
    box-shadow: 0 8px 40px rgb(0 0 0 / 70%);
    backdrop-filter: blur(12px);
    overflow: hidden;
    min-width: 520px;
    transition:
      border-color 0.4s ease,
      box-shadow 0.4s ease;

    /* Попадание — кроваво-красное свечение */
    &--hit {
      border-color: rgb(180 30 30 / 90%);
      box-shadow:
        0 8px 40px rgb(0 0 0 / 70%),
        0 0 40px rgb(180 30 30 / 50%),
        inset 0 0 30px rgb(160 20 20 / 15%);
    }

    /* Урон нанесён — тёмное кровавое свечение */
    &--done {
      border-color: rgb(140 10 10 / 95%);
      box-shadow:
        0 8px 40px rgb(0 0 0 / 80%),
        0 0 50px rgb(160 0 0 / 60%),
        inset 0 0 40px rgb(120 0 0 / 20%);
    }

    /* Промах — красноватое гашение */
    &--miss {
      border-color: rgb(200 60 60 / 50%);
      box-shadow:
        0 8px 40px rgb(0 0 0 / 70%),
        0 0 24px rgb(200 60 60 / 20%);
    }
  }

  /* ── Стороны ─────────────────────────────────────────────────────────────── */
  .combat-popup__side {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 20px 16px;
  }

  .combat-popup__side--attacker {
    background: rgb(239 68 68 / 5%);
    border-right: 1px solid rgb(255 255 255 / 8%);
  }

  .combat-popup__side--defender {
    background: rgb(59 130 246 / 5%);
  }

  .combat-popup__header {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 40%);
  }

  /* ── Аватар ─────────────────────────────────────────────────────────────── */
  .combat-popup__avatar-wrap {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid rgb(255 255 255 / 15%);
    flex-shrink: 0;
  }

  .combat-popup__side--attacker .combat-popup__avatar-wrap {
    border-color: rgb(239 68 68 / 50%);
    box-shadow: 0 0 12px rgb(239 68 68 / 30%);
  }

  .combat-popup__side--defender .combat-popup__avatar-wrap {
    border-color: rgb(59 130 246 / 50%);
    box-shadow: 0 0 12px rgb(59 130 246 / 30%);
  }

  .combat-popup__avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .combat-popup__name {
    font-size: 14px;
    font-weight: 700;
    color: rgb(255 255 255 / 90%);
    text-align: center;
  }

  /* ── HP и AP ─────────────────────────────────────────────────────────────── */
  .combat-popup__stat {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
  }

  .combat-popup__stat-icon {
    flex-shrink: 0;
  }

  .combat-popup__stat-icon--hp {
    color: #f87171;
  }

  .combat-popup__stat-icon--ap {
    color: #fbbf24;
  }

  .combat-popup__stat-value {
    font-size: 11px;
    font-weight: 600;
    color: rgb(255 255 255 / 55%);
    min-width: 30px;
    text-align: right;
    flex-shrink: 0;
  }

  .combat-popup__hp-number {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
  }

  .combat-popup__hp-current {
    font-size: 22px;
    font-weight: 800;
    color: #f87171;
    line-height: 1;
  }

  .combat-popup__hp-sep {
    font-size: 14px;
    color: rgb(255 255 255 / 30%);
    line-height: 1;
  }

  .combat-popup__hp-max {
    font-size: 14px;
    font-weight: 600;
    color: rgb(255 255 255 / 50%);
    line-height: 1;
  }

  .combat-popup__hp-bar-wrap {
    width: 100%;
  }

  .combat-popup__hp-bar {
    flex: 1;
    height: 7px;
    background: rgb(255 255 255 / 10%);
    border-radius: 4px;
    overflow: hidden;
  }

  .combat-popup__hp-fill {
    height: 100%;
    background: linear-gradient(90deg, #ef4444, #f87171);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .combat-popup__ap-dots {
    flex: 1;
    display: flex;
    gap: 5px;
    justify-content: flex-start;
  }

  .combat-popup__ap-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fbbf24;
    box-shadow: 0 0 4px rgb(251 191 36 / 50%);
    flex-shrink: 0;
  }

  .combat-popup__ap-dot--used {
    background: rgb(255 255 255 / 15%);
    box-shadow: none;
  }

  /* ── Боевые характеристики ──────────────────────────────────────────────── */
  .combat-popup__combat-stats {
    width: 100%;
    margin-top: 2px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .combat-popup__csrow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .combat-popup__cslabel {
    font-size: 10px;
    color: rgb(255 255 255 / 35%);
    letter-spacing: 0.04em;
  }

  .combat-popup__csval {
    font-size: 11px;
    font-weight: 700;
    color: rgb(255 255 255 / 65%);
  }

  /* ── Действия ────────────────────────────────────────────────────────────── */
  .combat-popup__actions {
    width: 100%;
    margin-top: 4px;
  }

  .combat-popup__actions-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: rgb(255 255 255 / 30%);
    margin-bottom: 6px;
  }

  .combat-popup__action {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: rgb(255 255 255 / 6%);
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 8px;
    color: rgb(255 255 255 / 80%);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition:
      background 0.15s,
      border-color 0.15s,
      opacity 0.15s;

    &:hover:not(:disabled) {
      background: rgb(255 255 255 / 12%);
      border-color: rgb(255 255 255 / 20%);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  /* ── Разделитель + кубики ─────────────────────────────────────────────────── */
  .combat-popup__divider {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px 4px;
    align-self: center;
    flex-shrink: 0;
    min-width: 72px;
  }

  .combat-popup__roll-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .combat-popup__die {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: 10px;
    background: rgb(30 20 8 / 90%);
    border: 2px solid rgb(200 150 40 / 60%);
    box-shadow: 0 0 14px rgb(180 120 30 / 30%);
    transition: border-color 0.2s;

    &--damage {
      border-color: rgb(200 80 40 / 60%);
      box-shadow: 0 0 14px rgb(200 80 40 / 30%);
    }

    &--rolling {
      animation: die-roll 0.15s ease infinite alternate;
    }
  }

  @keyframes die-roll {
    from {
      transform: rotate(-4deg) scale(0.97);
    }

    to {
      transform: rotate(4deg) scale(1.03);
    }
  }

  .combat-popup__die-face {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: rgb(200 150 40 / 70%);
    text-transform: uppercase;
    line-height: 1;
  }

  .combat-popup__die-num {
    font-size: 22px;
    font-weight: 900;
    color: rgb(240 200 80);
    line-height: 1.1;
  }

  .combat-popup__roll-formula {
    font-size: 10px;
    color: rgb(255 255 255 / 45%);
    text-align: center;
    white-space: nowrap;

    strong {
      color: rgb(240 140 60);
      font-size: 12px;
    }

    &--damage strong {
      color: rgb(240 100 60);
    }
  }

  /* ── Кнопка закрытия ─────────────────────────────────────────────────────── */
  .combat-popup__close {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgb(255 255 255 / 8%);
    border: 1px solid rgb(255 255 255 / 12%);
    color: rgb(255 255 255 / 50%);
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;

    &:hover {
      background: rgb(255 255 255 / 15%);
      color: rgb(255 255 255 / 90%);
    }
  }

  /* ── Анимация появления попапа ───────────────────────────────────────────── */
  .combat-popup-enter-active {
    animation: popup-slide-up 0.25s ease;
  }

  .combat-popup-leave-active {
    animation: popup-slide-up 0.2s ease reverse;
  }

  @keyframes popup-slide-up {
    from {
      opacity: 0;
      transform: translate(-50%, calc(-50% + 20px));
    }

    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  /* ── Анимации аватара защищающегося ─────────────────────────────────────── */

  /* При броске на попадание (первый удар) */
  .combat-popup__avatar-wrap--hit {
    animation: avatar-shake 0.45s ease;
    border-color: rgb(220 50 50 / 90%) !important;
    box-shadow: 0 0 18px rgb(220 50 50 / 50%) !important;
    transition:
      border-color 0s,
      box-shadow 0s;
  }

  .combat-popup__avatar-wrap--hit .combat-popup__avatar {
    animation: avatar-red-tint 0.8s ease forwards;
  }

  /* При зачислении урона (done) — тяжёлое получение урона */
  .combat-popup__avatar-wrap--done {
    animation: avatar-damage 0.6s ease;
    border-color: rgb(160 10 10 / 95%) !important;
    box-shadow:
      0 0 28px rgb(200 0 0 / 70%),
      0 0 8px rgb(255 40 40 / 40%) !important;
    transition:
      border-color 0s,
      box-shadow 0s;
  }

  .combat-popup__avatar-wrap--done .combat-popup__avatar {
    animation: avatar-blood-flash 0.6s ease forwards;
  }

  .combat-popup__avatar-wrap--miss {
    animation: avatar-celebrate 0.7s ease;
    border-color: rgb(96 165 250 / 90%) !important;
    box-shadow: 0 0 22px rgb(96 165 250 / 60%) !important;
    transition:
      border-color 0s,
      box-shadow 0s;
  }

  .combat-popup__avatar-wrap--miss .combat-popup__avatar {
    animation: avatar-blue-flash 0.7s ease;
  }

  @keyframes avatar-shake {
    0%,
    100% {
      transform: translateX(0) rotate(0);
    }

    15% {
      transform: translateX(-7px) rotate(-4deg);
    }

    30% {
      transform: translateX(7px) rotate(4deg);
    }

    45% {
      transform: translateX(-5px) rotate(-3deg);
    }

    60% {
      transform: translateX(5px) rotate(3deg);
    }

    75% {
      transform: translateX(-3px) rotate(-1deg);
    }

    90% {
      transform: translateX(2px);
    }
  }

  /* Отпрыгивание назад + подача вперёд по инерции */
  @keyframes avatar-damage {
    0% {
      transform: translateX(0) scale(1);
    }

    10% {
      transform: translateX(-14px) rotate(-6deg) scale(0.94);
    }

    25% {
      transform: translateX(10px) rotate(5deg) scale(1.02);
    }

    40% {
      transform: translateX(-8px) rotate(-4deg) scale(0.97);
    }

    55% {
      transform: translateX(6px) rotate(3deg) scale(1.01);
    }

    70% {
      transform: translateX(-4px) rotate(-2deg);
    }

    85% {
      transform: translateX(2px);
    }

    100% {
      transform: translateX(0) rotate(0) scale(1);
    }
  }

  @keyframes avatar-red-tint {
    0% {
      filter: brightness(1) saturate(1);
    }

    25% {
      filter: brightness(1.4) saturate(2.5) hue-rotate(-30deg);
    }

    55% {
      filter: brightness(1.2) saturate(1.8) hue-rotate(-15deg);
    }

    100% {
      filter: brightness(1) saturate(1);
    }
  }

  /* Тяжёлый кровавый всплеск + темнеет */
  @keyframes avatar-blood-flash {
    0% {
      filter: brightness(1) saturate(1);
    }

    15% {
      filter: brightness(2) saturate(3) hue-rotate(-40deg) contrast(1.4);
    }

    35% {
      filter: brightness(0.7) saturate(2.5) hue-rotate(-25deg) contrast(1.2);
    }

    60% {
      filter: brightness(1.1) saturate(2) hue-rotate(-20deg);
    }

    100% {
      filter: brightness(1) saturate(1);
    }
  }

  @keyframes avatar-celebrate {
    0% {
      transform: translateY(0) rotate(0) scale(1);
    }

    20% {
      transform: translateY(-12px) rotate(-8deg) scale(1.1);
    }

    40% {
      transform: translateY(-7px) rotate(7deg) scale(1.06);
    }

    60% {
      transform: translateY(-11px) rotate(-5deg) scale(1.09);
    }

    80% {
      transform: translateY(-3px) rotate(3deg) scale(1.02);
    }

    100% {
      transform: translateY(0) rotate(0) scale(1);
    }
  }

  @keyframes avatar-blue-flash {
    0%,
    100% {
      filter: brightness(1) saturate(1);
    }

    20%,
    60% {
      filter: brightness(1.5) saturate(2.5) hue-rotate(180deg);
    }

    40%,
    80% {
      filter: brightness(1.8) saturate(3) hue-rotate(200deg);
    }
  }

  @keyframes avatar-blue-flash {
    0%,
    100% {
      filter: brightness(1) saturate(1);
    }

    20%,
    60% {
      filter: brightness(1.5) saturate(2.5) hue-rotate(180deg);
    }

    40%,
    80% {
      filter: brightness(1.8) saturate(3) hue-rotate(200deg);
    }
  }
</style>

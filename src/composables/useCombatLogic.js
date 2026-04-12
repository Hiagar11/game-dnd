import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { playFist, playSuccess } from './useSound'
import { HIT_DC, calcCritChance, calcDamageBonus } from '../utils/combatFormulas'
import { hpPercentFromToken } from '../utils/hp'

export function useCombatLogic({ store, heroToken, npcToken, emitClose }) {
  const DEFAULT_AP = 4

  const phase = ref('idle')
  const hitRoll = ref(null)
  const damageRoll = ref(null)
  const rollingNumber = ref(1)
  const npcIsAttacking = ref(false)

  let punchGen = 0
  let rollingInterval = null

  const currentAttacker = computed(() => (npcIsAttacking.value ? npcToken.value : heroToken.value))
  const currentDefender = computed(() => (npcIsAttacking.value ? heroToken.value : npcToken.value))

  const phaseClass = computed(() => ({
    'combat-popup--hit': phase.value === 'hit' || phase.value === 'rolling-damage',
    'combat-popup--done': phase.value === 'done',
    'combat-popup--miss': phase.value === 'miss',
  }))

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

  watch(
    () => store.combatPair,
    (pair) => {
      punchGen++
      stopRolling()
      if (pair) {
        phase.value = 'idle'
        hitRoll.value = null
        damageRoll.value = null
      }
      npcIsAttacking.value = pair?.npcInitiated ?? false
    }
  )

  function hpPercent(token) {
    return hpPercentFromToken(token)
  }

  function startRolling(sides) {
    rollingInterval = setInterval(() => {
      rollingNumber.value = Math.floor(Math.random() * sides) + 1
    }, 60)
  }

  function stopRolling() {
    if (!rollingInterval) return
    clearInterval(rollingInterval)
    rollingInterval = null
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  function resetPhase() {
    phase.value = 'idle'
    hitRoll.value = null
    damageRoll.value = null
  }

  async function onPunch(asNpc = false) {
    if (phase.value !== 'idle' || !heroToken.value || !npcToken.value) return
    npcIsAttacking.value = asNpc
    const attackerToken = asNpc ? npcToken.value : heroToken.value
    if (!store.spendActionPoint(attackerToken.uid)) return

    const myGen = ++punchGen

    phase.value = 'rolling-hit'
    startRolling(20)
    await delay(700)
    if (punchGen !== myGen) return
    stopRolling()

    const d20 = Math.floor(Math.random() * 20) + 1
    const bonus = calcCritChance(attackerToken)
    const total = d20 + bonus
    hitRoll.value = { d20, bonus, total }

    if (total < HIT_DC) {
      phase.value = 'miss'
      await delay(2000)
      if (punchGen !== myGen) return
      resetPhase()
      store.endTurn()
      emitClose()
      return
    }

    phase.value = 'hit'
    playSuccess()
    await delay(1500)
    if (punchGen !== myGen) return

    phase.value = 'rolling-damage'
    startRolling(4)
    await delay(700)
    if (punchGen !== myGen) return
    stopRolling()

    const d4 = Math.floor(Math.random() * 4) + 1
    const dmgBonus = calcDamageBonus(attackerToken)
    const dmgTotal = d4 + dmgBonus
    damageRoll.value = { d4, bonus: dmgBonus, total: dmgTotal }

    const liveDefender = asNpc ? heroToken.value : npcToken.value
    if (liveDefender) {
      const newHp = Math.max(0, (liveDefender.hp ?? 0) - dmgTotal)
      store.editPlacedToken(liveDefender.uid, { hp: newHp })
    }
    playFist()

    phase.value = 'done'
    await delay(2000)
    if (punchGen !== myGen) return

    if ((currentAttacker.value?.actionPoints ?? 0) <= 0) {
      resetPhase()
      store.endTurn()
      emitClose()
      return
    }

    resetPhase()
  }

  function onClose() {
    punchGen++
    stopRolling()
    resetPhase()
    emitClose()
  }

  onBeforeUnmount(() => {
    punchGen++
    stopRolling()
  })

  return {
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
  }
}

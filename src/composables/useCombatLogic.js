import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { DEFAULT_AP } from '../constants/combat'
import { playFist, playSuccess, playMiss } from './useSound'
import {
  HIT_DC,
  DUAL_WIELD_HIT_PENALTY,
  calcCritChance,
  calcEvasion,
  calcMagicResist,
  calcBlock,
  calcCritDamage,
  calcArmorPen,
  calcMagicPen,
  getEffectiveStats,
  rollWeaponDamage,
  getWeaponDamageRange,
  calcTotalArmor,
  isMagicWeapon,
  getAttackApCost,
  isDualWielding,
  rollOffhandDamage,
} from '../utils/combatFormulas'
import { hpPercentFromToken } from '../utils/hp'
import { ADJACENT_2x2 } from './useTokenMove'
import { getPassiveDerivedBonus } from '../utils/passiveBonuses'

export function useCombatLogic({ store, heroToken, npcToken, emitClose }) {
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
    if (phase.value === 'hit' || phase.value === 'rolling-damage') {
      return hitRoll.value?.d20 === 20 ? 'Критический удар!' : 'Успех!'
    }
    if (phase.value === 'done') {
      const suffix = damageRoll.value?.blocked ? ' (блок!)' : ''
      return `${damageRoll.value?.total} урона!${suffix}`
    }
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

  function getCurrentTurnUid() {
    const order = store.initiativeOrder ?? []
    const currentIndex = store.currentInitiativeIndex ?? 0
    return order[currentIndex]?.uid ?? null
  }

  async function onPunch(asNpc = false) {
    if (phase.value !== 'idle' || !heroToken.value || !npcToken.value) return
    npcIsAttacking.value = asNpc
    const attackerToken = asNpc ? npcToken.value : heroToken.value
    const defenderToken = asNpc ? heroToken.value : npcToken.value

    if (store.combatMode) {
      const currentTurnUid = getCurrentTurnUid()
      if (currentTurnUid && currentTurnUid !== attackerToken.uid) return
    }

    // Ближняя атака — проверяем смежность
    const isAdjacent = ADJACENT_2x2.some(
      ([dc, dr]) =>
        defenderToken.col + dc === attackerToken.col && defenderToken.row + dr === attackerToken.row
    )
    if (!isAdjacent) return

    const apCost = getAttackApCost(attackerToken)
    if (!store.spendActionPoint(attackerToken.uid, apCost)) return

    const myGen = ++punchGen

    phase.value = 'rolling-hit'
    startRolling(20)
    await delay(700)
    if (punchGen !== myGen) return
    stopRolling()

    const d20 = Math.floor(Math.random() * 20) + 1
    const eStats = getEffectiveStats(attackerToken)
    const dStats = getEffectiveStats(defenderToken)
    const magic = isMagicWeapon(attackerToken)
    const dualWield = isDualWielding(attackerToken)
    const bonus = calcCritChance(eStats)
    const evasion =
      calcEvasion(dStats) + getPassiveDerivedBonus(defenderToken?.passiveAbilities, 'evasion')
    const hitPenalty = dualWield ? DUAL_WIELD_HIT_PENALTY : 0
    const total = d20 + bonus - evasion - hitPenalty
    hitRoll.value = { d20, bonus, evasion, total, hitPenalty }

    if (!magic && total < HIT_DC) {
      // Боевая память: NPC запоминает промах
      if (!asNpc && npcToken.value?.tokenType === 'npc') {
        const log = Array.isArray(npcToken.value.combatLog) ? [...npcToken.value.combatLog] : []
        log.push({
          attackerName: attackerToken?.name ?? 'Неизвестный',
          damage: 0,
          hit: false,
        })
        store.editPlacedToken(npcToken.value.uid, { combatLog: log })
      }
      phase.value = 'miss'
      playMiss()
      await delay(2000)
      if (punchGen !== myGen) return

      if ((currentAttacker.value?.actionPoints ?? 0) <= 0) {
        resetPhase()
        store.endTurn()
        emitClose()
        return
      }

      resetPhase()
      return
    }

    phase.value = 'hit'
    playSuccess()
    await delay(1500)
    if (punchGen !== myGen) return

    phase.value = 'rolling-damage'
    const wpnRange = getWeaponDamageRange(attackerToken)
    startRolling(wpnRange.max)
    await delay(700)
    if (punchGen !== myGen) return
    stopRolling()

    const weaponRoll = rollWeaponDamage(attackerToken)
    const isCrit = d20 === 20
    const pen = magic ? calcMagicPen(eStats) : calcArmorPen(eStats)
    const rawReduction = magic ? calcMagicResist(dStats) : calcTotalArmor(defenderToken)
    const reduction = Math.max(0, rawReduction - pen)

    let dmgTotal = Math.max(1, weaponRoll - reduction)
    if (isCrit) {
      const critMult = 1 + calcCritDamage(eStats) * 0.1
      dmgTotal = Math.max(1, Math.round(dmgTotal * critMult))
    }

    // Блок: шанс block×2%, снижает урон вдвое
    const blockChance = calcBlock(dStats) * 2
    const blocked = Math.random() * 100 < blockChance
    if (blocked) dmgTotal = Math.max(1, Math.floor(dmgTotal / 2))

    // Оффхенд: бонусный удар (половинный урон, без крита)
    let offhandDmg = 0
    if (dualWield) {
      const offRoll = rollOffhandDamage(attackerToken)
      offhandDmg = Math.max(1, offRoll - reduction)
      const offBlocked = Math.random() * 100 < blockChance
      if (offBlocked) offhandDmg = Math.max(1, Math.floor(offhandDmg / 2))
    }
    const totalDmg = dmgTotal + offhandDmg

    damageRoll.value = {
      d4: weaponRoll,
      bonus: 0,
      armor: reduction,
      total: totalDmg,
      magic,
      isCrit,
      blocked,
      offhandDmg,
    }

    const liveDefender = asNpc ? heroToken.value : npcToken.value
    if (liveDefender) {
      const newHp = Math.max(0, (liveDefender.hp ?? 0) - totalDmg)
      store.editPlacedToken(liveDefender.uid, { hp: newHp })

      // Боевая память: NPC запоминает кто нанёс урон
      if (liveDefender.tokenType === 'npc') {
        const liveAttacker = asNpc ? npcToken.value : heroToken.value
        const log = Array.isArray(liveDefender.combatLog) ? [...liveDefender.combatLog] : []
        log.push({
          attackerName: liveAttacker?.name ?? 'Неизвестный',
          damage: totalDmg,
          hit: true,
        })
        store.editPlacedToken(liveDefender.uid, { combatLog: log })
      }

      // Оглушение: если HP упало до 0 — NPC оглушён
      if (newHp === 0 && liveDefender.tokenType === 'npc') {
        store.editPlacedToken(liveDefender.uid, { stunned: true })
        store.checkCombatEnd()
        if (!store.combatMode) {
          // Бой завершён — показываем финальный удар, затем закрываем
          playFist()
          phase.value = 'done'
          await delay(1800)
          if (punchGen !== myGen) return
          resetPhase()
          emitClose()
          return
        }
      }
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

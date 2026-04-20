import { ref } from 'vue'
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
  calcTotalArmor,
  isMagicWeapon,
  getAttackApCost,
  isDualWielding,
  rollOffhandDamage,
} from '../utils/combatFormulas'
import { getCurrentScenarioId } from '../utils/scenario'

export function useTokenCombatInteraction({ store, damageFloatRef, getSocket }) {
  const flashMap = ref(new Map())

  function flashToken(uid, type) {
    flashMap.value = new Map(flashMap.value).set(uid, type)
    setTimeout(() => {
      const next = new Map(flashMap.value)
      next.delete(uid)
      flashMap.value = next
    }, 600)
  }

  /** Персистит combatLog NPC на сервер */
  function syncCombatLog(uid, log) {
    const scenarioId = getCurrentScenarioId(store)
    if (scenarioId && getSocket) {
      getSocket()?.emit('token:edit', { scenarioId, uid, fields: { combatLog: log } })
    }
  }

  function runQuickAttack(attackerToken, defenderToken) {
    const apCost = getAttackApCost(attackerToken)
    if (!store.spendActionPoint(attackerToken.uid, apCost)) {
      store.endTurn()
      return
    }

    const eStats = getEffectiveStats(attackerToken)
    const dStats = getEffectiveStats(defenderToken)
    const magic = isMagicWeapon(attackerToken)
    const dualWield = isDualWielding(attackerToken)

    // Магия всегда попадает; физ/дальний — d20 + шанс удара − уклонение
    const d20 = Math.floor(Math.random() * 20) + 1
    const hitBonus = calcCritChance(eStats)
    const evasion = calcEvasion(dStats)
    const hitPenalty = dualWield ? DUAL_WIELD_HIT_PENALTY : 0
    const total = d20 + hitBonus - evasion - hitPenalty
    const isHit = magic || total >= HIT_DC

    if (isHit) {
      flashToken(defenderToken.uid, 'hit')
      playSuccess()

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

      const liveDefender = store.placedTokens.find((t) => t.uid === defenderToken.uid)
      if (liveDefender) {
        const newHp = Math.max(0, (liveDefender.hp ?? 0) - totalDmg)
        store.editPlacedToken(liveDefender.uid, { hp: newHp })

        // Боевая память: NPC запоминает кто нанёс урон
        if (liveDefender.tokenType === 'npc') {
          const log = Array.isArray(liveDefender.combatLog) ? [...liveDefender.combatLog] : []
          log.push({
            attackerName: attackerToken?.name ?? 'Неизвестный',
            damage: totalDmg,
            hit: true,
          })
          store.editPlacedToken(liveDefender.uid, { combatLog: log })
          syncCombatLog(liveDefender.uid, log)
        }

        // Оглушение: если HP упало до 0 — NPC оглушён
        if (newHp === 0 && liveDefender.tokenType === 'npc') {
          store.editPlacedToken(liveDefender.uid, { stunned: true })
          store.checkCombatEnd()
        }
      }
      playFist()

      const hc = store.halfCell
      const x = defenderToken.col * hc + store.gridNormOX + hc
      const y = defenderToken.row * hc + store.gridNormOY + hc
      const floatText = dualWield ? `-${dmgTotal}+${offhandDmg}` : `-${totalDmg}`
      damageFloatRef.value?.spawn(defenderToken.uid, floatText, x, y)
    } else {
      flashToken(defenderToken.uid, 'miss')
      playMiss()

      // Боевая память: NPC запоминает промах
      const liveDefender = store.placedTokens.find((t) => t.uid === defenderToken.uid)
      if (liveDefender?.tokenType === 'npc') {
        const log = Array.isArray(liveDefender.combatLog) ? [...liveDefender.combatLog] : []
        log.push({
          attackerName: attackerToken?.name ?? 'Неизвестный',
          damage: 0,
          hit: false,
        })
        store.editPlacedToken(liveDefender.uid, { combatLog: log })
        syncCombatLog(liveDefender.uid, log)
      }
    }

    if ((attackerToken.actionPoints ?? 0) <= 0) {
      store.endTurn()
    }
  }

  return {
    flashMap,
    flashToken,
    runQuickAttack,
  }
}

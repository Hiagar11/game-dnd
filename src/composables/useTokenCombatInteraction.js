import { ref } from 'vue'
import { playFist, playSuccess } from './useSound'
import { HIT_DC, calcCritChance, calcDamageBonus } from '../utils/combatFormulas'

export function useTokenCombatInteraction({ store, damageFloatRef }) {
  const flashMap = ref(new Map())

  function flashToken(uid, type) {
    flashMap.value = new Map(flashMap.value).set(uid, type)
    setTimeout(() => {
      const next = new Map(flashMap.value)
      next.delete(uid)
      flashMap.value = next
    }, 600)
  }

  function runQuickAttack(attackerToken, defenderToken) {
    if (!store.spendActionPoint(attackerToken.uid)) {
      store.endTurn()
      return
    }

    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + calcCritChance(attackerToken)

    if (total >= HIT_DC) {
      flashToken(defenderToken.uid, 'hit')
      playSuccess()

      const d4 = Math.floor(Math.random() * 4) + 1
      const dmgTotal = d4 + calcDamageBonus(attackerToken)

      const liveDefender = store.placedTokens.find((t) => t.uid === defenderToken.uid)
      if (liveDefender) {
        store.editPlacedToken(liveDefender.uid, {
          hp: Math.max(0, (liveDefender.hp ?? 0) - dmgTotal),
        })
      }
      playFist()

      const hc = store.halfCell
      const x = defenderToken.col * hc + store.gridNormOX + hc
      const y = defenderToken.row * hc + store.gridNormOY + hc
      damageFloatRef.value?.spawn(defenderToken.uid, `-${dmgTotal}`, x, y)
    } else {
      flashToken(defenderToken.uid, 'miss')
    }

    store.endTurn()
  }

  return {
    flashMap,
    runQuickAttack,
  }
}

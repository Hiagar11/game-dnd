import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { getExecutor } from '../abilities/registry'
import { getActiveWeapon } from '../utils/combatFormulas'
import { getBaseActionPoints } from '../utils/actionPoints'
import {
  playMiss,
  playTauntCry,
  playCleaveStab,
  playCleaveCrack,
  playRushScream,
  playRushImpact,
  playShadowEnter,
  playShadowExit,
} from './useSound'
import { useFogVisibility } from './useFogVisibility'

/**
 * Composable для исполнения способностей.
 *
 * Способности делятся по areaType:
 *  - null          → на себя (невидимость)
 *  - 'single'      → выбор одной цели (маскировка, лечение, отравление)
 *  - 'targeted'    → выбор клетки на карте (AoE)
 *  - 'self'        → мгновенно вокруг себя
 *
 * Логика исполнения делегируется экзекьюторам из src/abilities/executors/.
 * Новая способность = новый файл в executors/ (авторегистрация).
 */
export function useAbilityExecution(damageFloatRef, flashTokenFn) {
  const store = useGameStore()
  const { isAreaVisible } = useFogVisibility()

  /** Текущий кастер — тот, кто выбрал способность */
  const caster = computed(() => {
    const uid = store.pendingAbility?.tokenUid
    if (!uid) return null
    return store.placedTokens.find((t) => t.uid === uid) ?? null
  })

  /** Мгновенная способность (без выбора цели) */
  const isInstant = computed(() => {
    const at = store.pendingAbility?.areaType
    return at === null || at === 'self'
  })

  /** Нужен ли выбор цели-токена */
  const needsTargetToken = computed(() => store.pendingAbility?.areaType === 'single')

  /** Нужен ли выбор клетки на карте */
  const needsTargetCell = computed(() => store.pendingAbility?.areaType === 'targeted')

  // ─── Управление эффектами ────────────────────────────────────
  function addEffect(token, effect) {
    if (!token.activeEffects) token.activeEffects = []
    const existing = token.activeEffects.findIndex((e) => e.id === effect.id)
    if (existing !== -1) token.activeEffects.splice(existing, 1)
    token.activeEffects.push({ ...effect })
  }

  function removeEffect(token, effectId) {
    if (!token.activeEffects) return
    token.activeEffects = token.activeEffects.filter((e) => e.id !== effectId)
  }

  function hasEffect(token, effectId) {
    return token.activeEffects?.some((e) => e.id === effectId) ?? false
  }

  // ─── Вспомогательные: DamageFloat + Flash ────────────────────
  function spawnDamage(targetToken, dmg, color) {
    if (flashTokenFn) flashTokenFn(targetToken.uid, 'hit')
    if (damageFloatRef?.value) {
      const hc = store.cellSize / 2
      const ox = store.gridNormOX
      const oy = store.gridNormOY
      const cx = (targetToken.col + 1) * hc + ox
      const cy = (targetToken.row + 1) * hc + oy
      damageFloatRef.value.spawn(targetToken.uid, `-${dmg}`, cx, cy, color)
    }
  }

  function enterCombatFromAbility(casterUid, actionPointsAfterCast = 0) {
    if (store.combatMode || typeof store.enterCombat !== 'function') {
      return { started: false, shouldAutoEndTurn: false }
    }

    store.enterCombat(casterUid)

    const combatCaster = store.placedTokens.find((token) => token?.uid === casterUid)
    if (!combatCaster) {
      return { started: true, shouldAutoEndTurn: false }
    }

    combatCaster.actionPoints = Math.min(
      combatCaster.actionPoints ?? actionPointsAfterCast,
      actionPointsAfterCast
    )

    const shouldAutoEndTurn = (combatCaster.actionPoints ?? 0) <= 0
    if (shouldAutoEndTurn) {
      combatCaster.movementPoints = 0
    }

    return {
      started: true,
      shouldAutoEndTurn,
      casterUid,
    }
  }

  function completeCombatHandoff(handoff, ability) {
    if (!handoff?.shouldAutoEndTurn || !store.combatMode || typeof store.endTurn !== 'function') {
      return
    }

    if (ability?.skipAutoEndTurn) return

    const currentUid = store.initiativeOrder?.[store.currentInitiativeIndex]?.uid ?? null
    if (handoff.casterUid && currentUid && currentUid !== handoff.casterUid) return

    store.endTurn()
  }

  /** Контекст, передаваемый каждому экзекьютору */
  function buildCtx(executionState = { combatHandoffRequested: false }) {
    return {
      store,
      flash: flashTokenFn ?? (() => {}),
      spawnDamage,
      damageFloat: damageFloatRef,
      addEffect,
      removeEffect,
      hasEffect,
      triggerVfx: (type, data) => {
        store.abilityVfx = { type, ...data }
      },
      enterCombatFromAbility: (casterUid, actionPointsAfterCast = 0) => {
        executionState.combatHandoffRequested = true
        return enterCombatFromAbility(casterUid, actionPointsAfterCast)
      },
      completeCombatHandoff: (handoff, ability) => completeCombatHandoff(handoff, ability),
      playMiss,
      playTauntCry,
      playCleaveStab,
      playCleaveCrack,
      playRushScream,
      playRushImpact,
      playShadowEnter,
      playShadowExit,
      isAreaVisible,
    }
  }

  // ─── Исполнение способности ──────────────────────────────────
  function executeAbility(target) {
    const ability = store.pendingAbility
    if (!ability) return false
    const token = caster.value
    if (!token) return false

    const consumeAllActionPoints = Boolean(ability.consumeAllActionPoints)
    const forceEndTurn = Boolean(ability.forceEndTurn)

    // Стоимость AP (масштабируется от оружия для melee-способностей с weaponApScaling)
    let cost = ability.apCost ?? 1
    if (ability.weaponApScaling) {
      const weaponAp = getActiveWeapon(token)?.apCost ?? 1
      cost = Math.max(cost, weaponAp)
    }

    if (ability.requiresFullActionPoints) {
      const fullActionPoints = getBaseActionPoints(token) + (token.bonusAp ?? 0)
      const currentActionPoints = token.actionPoints ?? 0
      if (token.spentActionPointsThisTurn) return false
      if (currentActionPoints < fullActionPoints) return false
    }

    if (consumeAllActionPoints) {
      // Вне боевого режима не проверяем AP (например, Ярость работает везде)
      if (store.combatMode && (token.actionPoints ?? 0) <= 0) return false
    } else if (cost > 0 && (token.actionPoints ?? 0) < cost) {
      return false
    }

    // Валидация цели
    const needsToken = ability.areaType === 'single'
    const needsCell = ability.areaType === 'targeted'
    if (needsToken && !target) return false
    if (needsCell && target?.col == null) return false

    // Делегируем экзекьютору
    const executor = getExecutor(ability.id)
    if (!executor) return false

    const executionState = { combatHandoffRequested: false }
    const executorResult = executor(buildCtx(executionState), token, target, ability)

    // Executor вернул false → отказ от каста (например, цель вне радиуса).
    // AP не тратим, pendingAbility оставляем — игрок может выбрать другую клетку.
    if (executorResult === false) return false

    // Тратим AP (всегда, не только в бою)
    if (consumeAllActionPoints) {
      token.actionPoints = 0
      token.spentActionPointsThisTurn = true
    } else if (cost > 0) {
      token.actionPoints -= cost
      token.spentActionPointsThisTurn = true
    }

    // Сброс pending
    store.pendingAbility = null
    store.abilityPreviewPoints = []

    // Автозавершение хода при исчерпании AP
    // (skipAutoEndTurn: способность даёт MP — игрок должен успеть ими воспользоваться)
    if (
      store.combatMode &&
      !executionState.combatHandoffRequested &&
      ((token.actionPoints ?? 0) <= 0 || forceEndTurn) &&
      !ability.skipAutoEndTurn
    ) {
      store.endTurn()
    }

    return true
  }

  // ─── AoE (для обратной совместимости — вызывается из других мест) ─
  function executeAoE(ability, casterToken, targetCell) {
    const executor = getExecutor(ability.id)
    if (executor) executor(buildCtx(), casterToken, targetCell, ability)
  }

  // ─── Тик эффектов (вызывать в endTurn) ───────────────────────
  /**
   * Уменьшает remainingTurns для всех эффектов токена.
   * Обработка по СВОЙСТВАМ эффекта, а не по ID — новые эффекты
   * с damagePerTurn / apPenalty / healPerTurn работают автоматически.
   */
  function tickEffects(token) {
    if (!token.activeEffects?.length) return

    const expired = []

    for (const effect of token.activeEffects) {
      if (effect.remainingTurns == null) continue

      // Урон каждый ход (яд, кровотечение и т.д.)
      if (effect.damagePerTurn) {
        token.hp = Math.max(0, (token.hp ?? 0) - effect.damagePerTurn)
      }

      // Штраф к AP (замедление, оглушение и т.д.)
      if (effect.apPenalty) {
        token.actionPoints = Math.max(0, (token.actionPoints ?? 0) - effect.apPenalty)
      }

      // Лечение каждый ход (регенерация и т.д.)
      if (effect.healPerTurn) {
        const maxHp = store.calcMaxHp(token)
        token.hp = Math.min(maxHp, (token.hp ?? 0) + effect.healPerTurn)
      }

      effect.remainingTurns--
      if (effect.remainingTurns <= 0) expired.push(effect.id)
    }

    for (const id of expired) {
      onEffectExpire(token, id)
      removeEffect(token, id)
    }
  }

  /** Callback при истечении эффекта — откат визуала */
  function onEffectExpire(token, effectId) {
    if (effectId === 'disguise') {
      const fx = token.activeEffects?.find((e) => e.id === 'disguise')
      if (fx?.originalSrc) token.src = fx.originalSrc
    }
  }

  return {
    caster,
    isInstant,
    needsTargetToken,
    needsTargetCell,
    addEffect,
    removeEffect,
    hasEffect,
    executeAbility,
    executeAoE,
    tickEffects,
  }
}

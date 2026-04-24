import {
  getSelectedToken,
  isSameFaction,
  isHeroToken,
  isHostileNpcToken,
  isNeutralNpcToken,
  isNonSystemToken,
  isTalkableNpcToken,
} from '../utils/tokenFilters'
import { getForcedTauntTargetUid, isTauntAttackViolation } from '../utils/stunMechanics'
import { getAbilityCombatProfile } from '../utils/abilityCombatProfile'

const CONTAINER_TOKENS = new Set(['item', 'jar', 'bag'])

function getCurrentTurnUid(store) {
  const order = store.initiativeOrder ?? []
  const currentIndex = store.currentInitiativeIndex ?? 0
  return order[currentIndex]?.uid ?? null
}

export function useTokenClickInteraction({
  store,
  abilityExec,
  onDoorWalk,
  onContainerWalk,
  moveTowardTarget,
  runQuickAttack,
  closeContextMenu,
  onAttackClick,
  onNpcAttackClick,
  onTalkClick,
  isNpcReachable,
  isHeroReachableByNpc,
  getVisibleKeys,
  onCaptureClick,
  emitDoorTransition,
  onTauntBlocked,
}) {
  async function runQuickAttackFlow(attackerUid, defenderUid) {
    if (!attackerUid || !defenderUid) return

    const attacker = store.placedTokens.find((token) => token.uid === attackerUid)
    const defender = store.placedTokens.find((token) => token.uid === defenderUid)
    if (!attacker || !defender) return

    // Провокация: атакующий под taunt может бить только провокатора
    if (isTauntAttackViolation(attacker, defender, store.placedTokens)) {
      onTauntBlocked?.(attacker)
      return
    }

    if (!store.combatMode) {
      // При обычном ЛКМ-ударе инициатор сразу начинает бой первым.
      store.enterCombat(attackerUid, getVisibleKeys())
    }

    closeContextMenu()

    const reached = await moveTowardTarget(attackerUid, defender)
    if (!reached) {
      store.endTurn()
      return
    }

    const currentTurnUid = getCurrentTurnUid(store)
    if (currentTurnUid && currentTurnUid !== attackerUid) return

    const liveAttacker = store.placedTokens.find((token) => token.uid === attackerUid)
    const liveDefender = store.placedTokens.find((token) => token.uid === defenderUid)
    if (liveAttacker && liveDefender) runQuickAttack(liveAttacker, liveDefender)
  }

  async function onTokenClick(placed, event) {
    // ── Режим выбора цели способности ─────────────────────────────
    if (store.pendingAbility && abilityExec.needsTargetToken.value) {
      const casterUid = store.pendingAbility.tokenUid
      const caster = store.placedTokens.find((t) => t.uid === casterUid)

      // Способность только на союзников кастера — проверяем относительно его фракции
      if (store.pendingAbility.allyOnly) {
        if (!caster || !isSameFaction(caster, placed)) return
      }

      const abilityProfile = getAbilityCombatProfile(store.pendingAbility)

      // Провокация: атакующие single-способности можно направлять только в провокатора.
      // Не трогаем бафы/поддержку (allyOnly) и небоевые способности без урона.
      const forcedTauntTargetUid = getForcedTauntTargetUid(caster, store.placedTokens)
      const isOffensiveAbility =
        !store.pendingAbility.allyOnly && abilityProfile.damageKind !== 'none'
      if (isOffensiveAbility && forcedTauntTargetUid && placed.uid !== forcedTauntTargetUid) {
        onTauntBlocked?.(caster)
        return
      }

      // Способность на нейтрального NPC в мирное время → агрессия + бой
      if (!store.combatMode && isNeutralNpcToken(placed) && !placed.systemToken) {
        placed.attitude = 'hostile'
        // Инициатор агрессии становится первым в очереди боя.
        store.enterCombat(casterUid, getVisibleKeys())
      }

      // Ближний бой — сначала подойти к цели.
      // Дальние/магические single-способности работают с места.
      if (abilityProfile.requiresApproach) {
        const casterUid = store.pendingAbility.tokenUid
        const reached = await moveTowardTarget(casterUid, placed)
        if (!reached) {
          store.pendingAbility = null
          store.endTurn()
          return
        }
        // После движения берём актуальную ссылку на цель
        const liveTarget = store.placedTokens.find((t) => t.uid === placed.uid)
        if (!liveTarget) {
          store.pendingAbility = null
          return
        }
        abilityExec.executeAbility(liveTarget)
        return
      }

      abilityExec.executeAbility(placed)
      return
    }

    const selected = getSelectedToken(store.placedTokens, store.selectedPlacedUid)

    // Герой идёт через дверь
    if (placed.systemToken === 'door' && (placed.targetScenarioId || placed.globalMapExit)) {
      if (isNonSystemToken(selected)) {
        onDoorWalk(selected, placed)
        return
      }
    }

    // Герой идёт к контейнеру (сундук/кувшин)
    if (CONTAINER_TOKENS.has(placed.systemToken) && isNonSystemToken(selected)) {
      if (!placed.items?.length && (placed.opened || placed.systemToken === 'bag')) return
      onContainerWalk(selected, placed)
      return
    }

    // Ctrl+клик — открыть боевой попап (ручной бой)
    if (event?.ctrlKey) {
      event.preventDefault()
      if (!selected) return

      const isHeroAttackingNpc =
        isHeroToken(selected) && isHostileNpcToken(placed) && !placed.systemToken
      const isNpcAttackingHero = isHostileNpcToken(selected) && isHeroToken(placed)
      // Первый удар: герой → нейтральный NPC (Ctrl+клик в мирное время)
      const isFirstStrike =
        isHeroToken(selected) && isNeutralNpcToken(placed) && !placed.systemToken

      if (!isHeroAttackingNpc && !isNpcAttackingHero && !isFirstStrike) return

      // Нейтральный NPC становится враждебным → герой атакует первым
      if (isFirstStrike) placed.attitude = 'hostile'

      closeContextMenu()

      // Провокация должна работать симметрично: для героя и NPC под taunt.
      if (isTauntAttackViolation(selected, placed, store.placedTokens)) {
        onTauntBlocked?.(selected)
        return
      }

      // Провокация: NPC под таунтом может атаковать только провокатора
      if (isNpcAttackingHero) {
        if (isTauntAttackViolation(selected, placed, store.placedTokens)) {
          onTauntBlocked?.(selected)
          return
        }
      }

      if (isHeroAttackingNpc || isFirstStrike) {
        onAttackClick(placed)
        return
      }

      onNpcAttackClick(placed)
      return
    }

    // Если есть выбранный токен и кликаем на другой — проверяем доступное действие.
    // Действие имеет приоритет над переключением фокуса.
    if (selected && selected.uid !== placed.uid) {
      // Захват: любой выбранный токен → оглушённый НПС
      if (placed.stunned && !placed.captured && isNpcReachable(placed)) {
        onCaptureClick(placed)
        return
      }
      // Атака: только герой → враждебный НПС
      if (
        isHeroToken(selected) &&
        isHostileNpcToken(placed) &&
        !placed.stunned &&
        isNpcReachable(placed)
      ) {
        await runQuickAttackFlow(selected.uid, placed.uid)
        return
      }
      // Атака враждебного НПС → герой
      if (isHeroToken(placed) && isHeroReachableByNpc(placed)) {
        // Провокация: NPC под таунтом может атаковать только провокатора
        if (isTauntAttackViolation(selected, placed, store.placedTokens)) {
          onTauntBlocked?.(selected)
          return
        }
        await runQuickAttackFlow(selected.uid, placed.uid)
        return
      }
      // Разговор: герой или НПС → нейтральный/дружественный НПС
      if (!store.combatMode && isTalkableNpcToken(placed) && isNpcReachable(placed)) {
        onTalkClick(placed)
        return
      }
    }

    // Нет доступного действия — фокус на токене
    store.setCombatPair(null, null)
    store.selectPlacedToken(placed.uid)
    closeContextMenu()

    // Дверь без выбранного героя (ДМ кликает) → переход сцены
    if (placed.systemToken === 'door' && placed.targetScenarioId) {
      const sourceScenarioId = store.currentScenario?.id ?? null
      emitDoorTransition?.({ targetScenarioId: placed.targetScenarioId, sourceScenarioId })
    }
  }

  return {
    onTokenClick,
  }
}

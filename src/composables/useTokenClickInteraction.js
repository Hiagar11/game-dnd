import {
  getSelectedToken,
  isHeroToken,
  isHostileNpcToken,
  isNeutralNpcToken,
  isNonSystemToken,
  isTalkableNpcToken,
} from '../utils/tokenFilters'
import { getAbilityCombatProfile } from '../utils/abilityCombatProfile'

const CONTAINER_TOKENS = new Set(['item', 'jar', 'bag'])

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
}) {
  async function onTokenClick(placed, event) {
    // ── Режим выбора цели способности ─────────────────────────────
    if (store.pendingAbility && abilityExec.needsTargetToken.value) {
      const abilityProfile = getAbilityCombatProfile(store.pendingAbility)

      // Способность на нейтрального NPC в мирное время → агрессия + бой
      if (!store.combatMode && isNeutralNpcToken(placed) && !placed.systemToken) {
        placed.attitude = 'hostile'
        store.enterCombat(placed.uid, getVisibleKeys())
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

    // Ctrl+клик — быстрая атака / агрессия против нейтрального
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

      if (!store.combatMode) {
        // firstUid ходит последним: при first strike это NPC → герой идёт первым
        const firstUid = isFirstStrike ? placed.uid : selected.uid
        store.enterCombat(firstUid, getVisibleKeys())
      }
      closeContextMenu()

      moveTowardTarget(selected.uid, placed).then((reached) => {
        if (!reached) {
          store.endTurn()
          return
        }
        const liveAttacker = store.placedTokens.find((token) => token.uid === selected.uid)
        const liveDefender = store.placedTokens.find((token) => token.uid === placed.uid)
        if (liveAttacker && liveDefender) runQuickAttack(liveAttacker, liveDefender)
      })
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
        onAttackClick(placed)
        return
      }
      // Атака враждебного НПС → герой
      if (isHeroToken(placed) && isHeroReachableByNpc(placed)) {
        onNpcAttackClick(placed)
        return
      }
      // Разговор: герой или НПС → нейтральный/дружественный НПС
      if (isTalkableNpcToken(placed) && isNpcReachable(placed)) {
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

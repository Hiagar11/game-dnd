import {
  getSelectedToken,
  isHeroToken,
  isHostileNpcToken,
  isNonSystemToken,
  isTalkableNpcToken,
} from '../utils/tokenFilters'

export function useTokenClickInteraction({
  store,
  onDoorWalk,
  moveTowardTarget,
  runQuickAttack,
  closeContextMenu,
  onAttackClick,
  onNpcAttackClick,
  onTalkClick,
  heroReachable,
  npcReachable,
  isNpcReachable,
  isHeroReachableByNpc,
  getVisibleKeys,
  clickTimer,
  dblClickDelay,
}) {
  function onTokenClick(placed, event) {
    const selected = getSelectedToken(store.placedTokens, store.selectedPlacedUid)

    if (placed.systemToken === 'door' && placed.targetScenarioId) {
      if (isNonSystemToken(selected)) {
        onDoorWalk(selected, placed)
        return
      }
    }

    if (event?.ctrlKey) {
      event.preventDefault()
      if (!selected) return

      const isHeroAttackingNpc =
        isHeroToken(selected) && isHostileNpcToken(placed) && !placed.systemToken

      const isNpcAttackingHero = isHostileNpcToken(selected) && isHeroToken(placed)

      if (!isHeroAttackingNpc && !isNpcAttackingHero) return

      if (!store.combatMode) store.enterCombat(selected.uid, getVisibleKeys())
      store.selectPlacedToken(null)
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

    if (clickTimer.value !== null) {
      clearTimeout(clickTimer.value)
      clickTimer.value = null
      return
    }

    clickTimer.value = setTimeout(() => {
      clickTimer.value = null

      if (heroReachable.value.size > 0 && isHostileNpcToken(placed) && isNpcReachable(placed)) {
        onAttackClick(placed)
      } else if (
        npcReachable.value.size > 0 &&
        isHeroToken(placed) &&
        isHeroReachableByNpc(placed)
      ) {
        onNpcAttackClick(placed)
      } else if (
        heroReachable.value.size > 0 &&
        isTalkableNpcToken(placed) &&
        isNpcReachable(placed)
      ) {
        onTalkClick(placed)
      }
    }, dblClickDelay)
  }

  return {
    onTokenClick,
  }
}

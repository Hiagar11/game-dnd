import {
  isFriendlyNpcToken,
  isHeroToken,
  isHostileNpcToken,
  getNpcAttitudeScore,
  isNpcToken,
  isTalkableNpcToken,
} from '../utils/tokenFilters'

export function useGameTokenPresentation({
  props,
  store,
  heroesStore,
  fogHiddenKeys,
  isNpcReachable,
  isHeroReachableByNpc,
  isNonSystemSelected,
  flashMap,
  currentTurnUid,
}) {
  function tokenClasses(placed) {
    return {
      'game-tokens__token--selected': store.selectedPlacedUid === placed.uid,
      'game-tokens__token--viewer-selected':
        props.viewerMode && heroesStore.selectedUid === placed.uid,
      'game-tokens__token--admin-selected':
        props.viewerMode && heroesStore.adminSelectedUid === placed.uid,
      'game-tokens__token--shaking': store.shakingTokenUid === placed.uid,
      'game-tokens__token--fog-hidden': fogHiddenKeys.value.has(`${placed.col}:${placed.row}`),
      'game-tokens__token--hero': isHeroToken(placed),
      'game-tokens__token--hostile': isHostileNpcToken(placed),
      'game-tokens__token--friendly': isFriendlyNpcToken(placed),
      'game-tokens__token--neutral':
        isNpcToken(placed) && !isHostileNpcToken(placed) && !isFriendlyNpcToken(placed),
      'game-tokens__token--cursor-attack':
        !props.viewerMode &&
        ((isHostileNpcToken(placed) && isNpcReachable(placed)) ||
          (isHeroToken(placed) && isHeroReachableByNpc(placed))),
      'game-tokens__token--cursor-talk':
        !props.viewerMode && isTalkableNpcToken(placed) && isNpcReachable(placed),
      'game-tokens__token--cursor-door':
        !props.viewerMode &&
        placed.systemToken === 'door' &&
        !!(placed.targetScenarioId || placed.globalMapExit) &&
        isNonSystemSelected.value,
      'game-tokens__token--flash-hit': flashMap.value.get(placed.uid) === 'hit',
      'game-tokens__token--flash-miss': flashMap.value.get(placed.uid) === 'miss',
      'game-tokens__token--active-turn': currentTurnUid.value === placed.uid,
    }
  }

  function tokenStyle(placed) {
    const hc = store.halfCell
    const cs = store.cellSize
    const ox = store.gridNormOX
    const oy = store.gridNormOY
    return {
      left: `${placed.col * hc + ox}px`,
      top: `${placed.row * hc + oy}px`,
      width: `${cs}px`,
      height: `${cs}px`,
      '--cell': `${cs}px`,
    }
  }

  function npcScoreForDialog(dialogState, placed) {
    return dialogState?.npcScore ?? getNpcAttitudeScore(placed)
  }

  return {
    tokenClasses,
    tokenStyle,
    npcScoreForDialog,
  }
}

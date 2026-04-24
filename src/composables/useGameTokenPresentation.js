import {
  isFriendlyNpcToken,
  isHeroToken,
  isHostileNpcToken,
  getNpcAttitudeScore,
  isNpcToken,
  isTalkableNpcToken,
  getSelectedToken,
} from '../utils/tokenFilters'
import { RARITIES, RARITY_COLORS } from '../constants/lootRarity'
import { DEFAULT_AP } from '../constants/combat'

/** Возвращает цвет самого редкого предмета в контейнере (или null). */
function bestRarityColor(items) {
  if (!items?.length) return null
  let best = -1
  for (const item of items) {
    const idx = RARITIES.indexOf(item?.rarity)
    if (idx > best) best = idx
  }
  return best >= 0 ? RARITY_COLORS[RARITIES[best]] : null
}

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
    const selectedToken = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    const selectedIsHero = isHeroToken(selectedToken)
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
        ((selectedIsHero &&
          isHostileNpcToken(placed) &&
          !placed.stunned &&
          isNpcReachable(placed)) ||
          (isHeroToken(placed) && isHeroReachableByNpc(placed))),
      'game-tokens__token--cursor-talk':
        !props.viewerMode && isTalkableNpcToken(placed) && isNpcReachable(placed),
      'game-tokens__token--cursor-capture':
        !props.viewerMode && placed.stunned && !placed.captured && isNpcReachable(placed),
      'game-tokens__token--stunned': !!placed.stunned && !placed.captured,
      'game-tokens__token--dead':
        !placed.stunned && !placed.captured && isNpcToken(placed) && (placed.hp ?? 1) <= 0,
      'game-tokens__token--captured': !!placed.captured,
      'game-tokens__token--invisible': placed.activeEffects?.some((e) => e.id === 'invisibility'),
      'game-tokens__token--disguised': placed.activeEffects?.some((e) => e.id === 'disguise'),
      'game-tokens__token--poisoned': placed.activeEffects?.some((e) => e.id === 'poison'),
      'game-tokens__token--chilled': placed.activeEffects?.some((e) => e.id === 'chilled'),
      'game-tokens__token--ability-target':
        !props.viewerMode &&
        !!store.pendingAbility &&
        store.pendingAbility.areaType === 'single' &&
        placed.uid !== store.pendingAbility.tokenUid &&
        !placed.systemToken &&
        // allyOnly: подсвечиваем только союзников как допустимые цели
        (!store.pendingAbility.allyOnly ||
          placed.tokenType === 'hero' ||
          (placed.tokenType === 'npc' && placed.attitude === 'friendly')),
      'game-tokens__token--cursor-door':
        !props.viewerMode &&
        placed.systemToken === 'door' &&
        !!(placed.targetScenarioId || placed.globalMapExit) &&
        isNonSystemSelected.value,
      'game-tokens__token--flash-hit': flashMap.value.get(placed.uid) === 'hit',
      'game-tokens__token--flash-miss': flashMap.value.get(placed.uid) === 'miss',
      'game-tokens__token--flash-slash': flashMap.value.get(placed.uid) === 'slash',
      'game-tokens__token--flash-bash': flashMap.value.get(placed.uid) === 'bash',
      'game-tokens__token--flash-blood': flashMap.value.get(placed.uid) === 'blood',
      'game-tokens__token--flash-teleport': flashMap.value.get(placed.uid) === 'teleport',
      'game-tokens__token--flash-inspire': flashMap.value.get(placed.uid) === 'inspire',
      'game-tokens__token--active-turn': currentTurnUid.value === placed.uid,
      'game-tokens__token--ap-2':
        currentTurnUid.value === placed.uid && (placed.actionPoints ?? 0) >= 2,
      'game-tokens__token--ap-1':
        currentTurnUid.value === placed.uid && (placed.actionPoints ?? 0) === 1,
      'game-tokens__token--ap-0':
        currentTurnUid.value === placed.uid && (placed.actionPoints ?? 0) <= 0,
      'game-tokens__token--cursor-open':
        !props.viewerMode &&
        (placed.systemToken === 'item' ||
          placed.systemToken === 'jar' ||
          placed.systemToken === 'bag') &&
        isNonSystemSelected.value,
      'game-tokens__token--container':
        (placed.systemToken === 'item' ||
          placed.systemToken === 'jar' ||
          placed.systemToken === 'bag') &&
        !placed.opened,
      'game-tokens__token--container-opened':
        (placed.systemToken === 'item' || placed.systemToken === 'jar') && placed.opened,
      'game-tokens__token--half-size': !!placed.halfSize,
      'game-tokens__token--quarter-size': !!placed.quarterSize,
      'game-tokens__token--loot-glow':
        (placed.systemToken === 'bag' || !placed.opened) && !!bestRarityColor(placed.items),
      'game-tokens__token--locked': !!placed.locked,
      // Воодушевлён — ожидает бонусный AP на следующем ходу
      'game-tokens__token--inspired': !!(placed.bonusAp ?? 0),
    }
  }

  function tokenStyle(placed) {
    const hc = store.halfCell
    const cs = store.cellSize
    const ox = store.gridNormOX
    const oy = store.gridNormOY
    const w = placed.quarterSize ? hc : placed.halfSize ? hc : cs
    const h = placed.quarterSize ? hc : cs
    const glowColor =
      placed.systemToken === 'bag' || !placed.opened ? bestRarityColor(placed.items) : null
    return {
      left: `${placed.col * hc + ox}px`,
      top: `${placed.row * hc + oy}px`,
      width: `${w}px`,
      height: `${h}px`,
      '--cell': `${w}px`,
      '--ap': placed.actionPoints ?? 0,
      '--ap-max': DEFAULT_AP,
      ...(glowColor ? { '--loot-glow': glowColor } : {}),
    }
  }

  function npcScoreForDialog(dialogState, placed) {
    return dialogState?.npcScore ?? getNpcAttitudeScore(placed)
  }

  function hpPercent(placed) {
    const hp = placed.hp ?? placed.maxHp ?? 1
    const max = Math.max(1, placed.maxHp ?? 1)
    return Math.max(0, Math.min(100, Math.round((hp / max) * 100)))
  }

  function hpBarClass(placed) {
    const pct = hpPercent(placed)
    return {
      'game-tokens__hp-fill--high': pct > 60,
      'game-tokens__hp-fill--mid': pct > 30 && pct <= 60,
      'game-tokens__hp-fill--low': pct <= 30,
    }
  }

  return {
    tokenClasses,
    tokenStyle,
    npcScoreForDialog,
    hpPercent,
    hpBarClass,
  }
}

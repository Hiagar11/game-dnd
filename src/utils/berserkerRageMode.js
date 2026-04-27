const BERSERKER_RAGE_ID = 'berserker_rage'
export const BERSERKER_VISION_RADIUS = 6

export function hasBerserkerRageEffect(token) {
  const effects = token?.activeEffects
  if (!Array.isArray(effects) || !effects.length) return false
  return effects.some(
    (effect) => effect?.id === BERSERKER_RAGE_ID && (effect?.remainingTurns ?? 0) > 0
  )
}

export function getCurrentTurnUid(store) {
  const order = store?.initiativeOrder ?? []
  const currentIndex = store?.currentInitiativeIndex ?? 0
  return order[currentIndex]?.uid ?? null
}

export function isBerserkerVisionActive(store) {
  const selectedUid = store?.selectedPlacedUid
  if (!selectedUid) return false

  const selectedToken = store?.placedTokens?.find((token) => token?.uid === selectedUid)
  if (!hasBerserkerRageEffect(selectedToken)) return false

  // В боевом режиме: проверяем что это ход текущего персонажа
  if (store?.combatMode) {
    const currentTurnUid = getCurrentTurnUid(store)
    if (selectedUid !== currentTurnUid) return false
  }

  return true
}

export function isInBerserkerVisionRadius(
  sourceToken,
  targetToken,
  radius = BERSERKER_VISION_RADIUS
) {
  if (!sourceToken || !targetToken) return false
  const dc = Math.abs((sourceToken.col ?? 0) - (targetToken.col ?? 0))
  const dr = Math.abs((sourceToken.row ?? 0) - (targetToken.row ?? 0))
  return Math.sqrt(dc * dc + dr * dr) <= radius
}

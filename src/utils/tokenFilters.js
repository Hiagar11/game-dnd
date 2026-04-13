export function isNonSystemToken(token) {
  return !!(token && !token.systemToken)
}

export function isHeroToken(token) {
  return token?.tokenType === 'hero'
}

export function isNpcToken(token) {
  return token?.tokenType === 'npc'
}

export function isHostileNpcToken(token) {
  return isNpcToken(token) && getNpcAttitude(token) === 'hostile'
}

export function isFriendlyNpcToken(token) {
  return isNpcToken(token) && getNpcAttitude(token) === 'friendly'
}

export function isTalkableNpcToken(token) {
  const attitude = getNpcAttitude(token)
  return isNpcToken(token) && (attitude === 'neutral' || attitude === 'friendly')
}

export function getNpcAttitudeScore(tokenOrAttitude) {
  const attitude = getNpcAttitude(tokenOrAttitude)
  if (attitude === 'friendly') return 50
  if (attitude === 'hostile') return -50
  return 0
}

export function getNpcAttitude(tokenOrAttitude) {
  const attitude = typeof tokenOrAttitude === 'string' ? tokenOrAttitude : tokenOrAttitude?.attitude
  return attitude ?? 'neutral'
}

export function getSelectedToken(placedTokens, selectedUid) {
  if (!selectedUid) return null
  return placedTokens.find((entry) => entry.uid === selectedUid) ?? null
}

export function getSelectedNonSystemToken(placedTokens, selectedUid) {
  const token = getSelectedToken(placedTokens, selectedUid)
  return isNonSystemToken(token) ? token : null
}

export function getHeroTokens(tokens) {
  return tokens.filter((token) => token.tokenType === 'hero')
}

export function getHostileNpcTokens(tokens) {
  return tokens.filter((token) => isHostileNpcToken(token))
}

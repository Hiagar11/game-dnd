export function hpPercentFromValues(hp, maxHp) {
  const safeMaxHp = Number(maxHp) || 0
  if (safeMaxHp <= 0) return 100

  const safeHp = Number(hp)
  const value = Number.isFinite(safeHp) ? safeHp : safeMaxHp
  return Math.max(0, Math.min(100, (value / safeMaxHp) * 100))
}

export function hpPercentFromToken(token) {
  if (!token) return 100
  return hpPercentFromValues(token.hp, token.maxHp)
}

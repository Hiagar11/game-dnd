export function applySingleTargetDamage(ctx, targetUid, damage) {
  const liveTarget = ctx.store?.placedTokens?.find((token) => token?.uid === targetUid)
  if (!liveTarget) return null

  const nextHp = Math.max(0, (liveTarget.hp ?? 0) - damage)
  ctx.store.editPlacedToken?.(liveTarget.uid, { hp: nextHp })

  if (nextHp === 0 && liveTarget.tokenType === 'npc') {
    ctx.store.editPlacedToken?.(liveTarget.uid, { stunned: true })
    ctx.store.checkCombatEnd?.()
  }

  return {
    target: liveTarget,
    hp: nextHp,
    killed: nextHp === 0,
  }
}

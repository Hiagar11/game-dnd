import { applySingleTargetDamage } from './applySingleTargetDamage'

export function applyMultiTargetDamage(ctx, targets, resolveDamage, afterDamage) {
  const results = []

  for (const target of targets) {
    const damage = resolveDamage(target)
    const damageResult = applySingleTargetDamage(ctx, target.uid, damage)
    const result = {
      target,
      damage,
      damageResult,
    }
    results.push(result)
    afterDamage?.(result)
  }

  return results
}

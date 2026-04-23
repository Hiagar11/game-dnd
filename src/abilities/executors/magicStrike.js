import { getEffectiveStats, calcMagicResist, calcMagicPen } from '../../utils/combatFormulas'
import { duckBattleMusic, restoreBattleMusic } from '../../composables/useSound'

/** Магические удары — кровавый снаряд, гравитационный удар, кровавое иссушение */
export const ABILITY_IDS = ['blood_bolt', 'gravity_bolt', 'blood_leech']

function cellCenter(store, col, row) {
  const hc = store.cellSize / 2
  return {
    x: (col + 1) * hc + store.gridNormOX,
    y: (row + 1) * hc + store.gridNormOY,
  }
}

function applyMagicDamage(ctx, targetUid, dmg) {
  const liveTarget = ctx.store.placedTokens.find((t) => t.uid === targetUid)
  if (!liveTarget) return null

  const newHp = Math.max(0, (liveTarget.hp ?? 0) - dmg)
  ctx.store.editPlacedToken(liveTarget.uid, { hp: newHp })
  if (newHp === 0 && liveTarget.tokenType === 'npc') {
    ctx.store.editPlacedToken(liveTarget.uid, { stunned: true })
    ctx.store.checkCombatEnd()
  }

  return liveTarget
}

function spendBloodCost(ctx, casterUid) {
  const liveCaster = ctx.store.placedTokens.find((t) => t.uid === casterUid)
  if (!liveCaster) return
  // Минимум 1 HP — кастер не может убить себя своей магией
  ctx.store.editPlacedToken(liveCaster.uid, { hp: Math.max(1, (liveCaster.hp ?? 0) - 2) })
}

function healByLeech(ctx, casterUid, dmg) {
  const liveCaster = ctx.store.placedTokens.find((t) => t.uid === casterUid)
  if (!liveCaster) return
  const healAmt = Math.floor(dmg * 0.5)
  const maxHp = 10 + (liveCaster.strength ?? 0) * 2 + (liveCaster.agility ?? 0)
  ctx.store.editPlacedToken(liveCaster.uid, {
    hp: Math.min((liveCaster.hp ?? maxHp) + healAmt, maxHp),
  })
}

/**
 * Магический удар по одной цели. Урон = d8 + intellect.
 * Побочные эффекты зависят от конкретного заклинания.
 */
export function execute(ctx, caster, target, ability) {
  const color = ability.color ?? '#e2e8f0'
  const eStats = getEffectiveStats(caster)
  const dStats = getEffectiveStats(target)
  const intellect = eStats.intellect ?? 0

  // Базовый урон: d8 + intellect
  const roll = Math.floor(Math.random() * 8) + 1
  // Магическая пенетрация снижает сопротивление цели
  const pen = calcMagicPen(eStats)
  const resist = Math.max(0, calcMagicResist(dStats) - pen)
  const dmg = Math.max(1, roll + intellect - resist)

  // Кровавый снаряд: staged-каст с рунами, материализацией и полётом
  if (ability.id === 'blood_bolt') {
    // Сцена: 3с каста + 1с полёт/попадание
    const CAST_START_MS = 0
    const PROJECTILE_LAUNCH_MS = 3000
    const PROJECTILE_FLIGHT_MS = 1000

    // Плата кровью — в начале каста
    spendBloodCost(ctx, caster.uid)
    duckBattleMusic(160)

    setTimeout(() => {
      const liveCaster = ctx.store.placedTokens.find((t) => t.uid === caster.uid) ?? caster
      ctx.triggerVfx('bloodCast', {
        col: liveCaster.col,
        row: liveCaster.row,
        color,
      })
    }, CAST_START_MS)

    setTimeout(() => {
      const liveCaster = ctx.store.placedTokens.find((t) => t.uid === caster.uid) ?? caster
      const liveTarget = ctx.store.placedTokens.find((t) => t.uid === target.uid) ?? target
      const from = cellCenter(ctx.store, liveCaster.col, liveCaster.row)
      const to = cellCenter(ctx.store, liveTarget.col, liveTarget.row)
      ctx.store.abilityProjectile = {
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        color,
        icon: ability.icon ?? 'drop',
        kind: 'bloodBolt',
        durationMs: PROJECTILE_FLIGHT_MS,
      }
    }, PROJECTILE_LAUNCH_MS)

    setTimeout(
      () => {
        const liveTarget = applyMagicDamage(ctx, target.uid, dmg)
        restoreBattleMusic(1200)
        if (!liveTarget) return
        ctx.spawnDamage(liveTarget, dmg, color)
        ctx.flash(liveTarget.uid, 'blood')
        ctx.triggerVfx('bloodImpact', {
          col: liveTarget.col,
          row: liveTarget.row,
          color,
        })
      },
      PROJECTILE_LAUNCH_MS + PROJECTILE_FLIGHT_MS + 20
    )

    return
  }

  // Обычные магические single-удары — мгновенное применение
  const liveTarget = applyMagicDamage(ctx, target.uid, dmg)
  if (liveTarget) {
    ctx.spawnDamage(liveTarget, dmg, color)
  }

  // ── Побочные эффекты по типу заклинания ──

  // Кровавое иссушение: вампиризм 50% урона
  if (ability.id === 'blood_leech') {
    healByLeech(ctx, caster.uid, dmg)
  }

  // Гравитационный удар: притяжение −1 AP следующий ход
  if (ability.id === 'gravity_bolt') {
    ctx.addEffect(target, {
      id: 'gravity-slow',
      name: 'Притяжение',
      icon: 'magnet-blast',
      color: '#8b5cf6',
      remainingTurns: 1,
      apPenalty: 1,
      casterUid: caster.uid,
    })
  }
}

import { isNeutralNpcToken, isSameFaction } from '../../utils/tokenFilters'
import { buildCleaveCells } from '../../utils/cleavePattern'
import { applyMultiTargetDamage } from '../utils/applyMultiTargetDamage'
import { getActiveDamageMult } from '../utils/activeEffectBonuses'

export const ABILITY_ID = 'cleave'
const CLEAVE_CRACK_DELAY_MS = 440
const CLEAVE_AGGRO_LEAD_MS = 140

function spawnAggroFloat(ctx, target) {
  if (!ctx.damageFloat?.value || !target) return

  const hc = (ctx.store?.cellSize ?? 60) / 2
  const ox = ctx.store?.gridNormOX ?? 0
  const oy = ctx.store?.gridNormOY ?? 0
  const cx = (target.col + 1) * hc + ox
  const cy = (target.row + 1) * hc + oy

  ctx.damageFloat.value.spawn(target.uid, 'Агрессия!', cx, cy, '#ef4444')
}

/**
 * Раскол — удар по области вокруг кастера.
 *
 * Механика:
 * - цель задаётся направлением курсора (areaType='targeted')
 * - бьёт врагов на 3 фантомных клетках-клине вокруг кастера
 * - сначала идёт фаза «всадил меч», затем «треск земли»
 * - при агре нейтралов есть короткая пауза: вспышка/надпись читаются до цифр урона
 * - урон вычитается в момент треска (через задержку)
 * - урон считается отдельно для каждой поражённой цели
 * - урон считается как d6 + STR (силовой AoE-подход)
 */
export function execute(ctx, caster, targetCell, ability) {
  const strengthScaling = ability?.strengthScaling ?? 1
  const color = ability?.color ?? '#ef4444'
  const phantomCells = buildCleaveCells(caster, targetCell)
  const phantomCellKeys = new Set(phantomCells.map((cell) => `${cell.col},${cell.row}`))
  const strength = caster?.strength ?? 0

  // Фаза 1: вонзание меча и запуск визуала раскола.
  ctx.playCleaveStab?.()
  ctx.triggerVfx?.('cleaveRift', {
    col: caster.col,
    row: caster.row,
    cells: phantomCells,
    color,
    crackDelayMs: CLEAVE_CRACK_DELAY_MS,
  })

  setTimeout(() => {
    // Фаза 2: треск земли. Цели берём в момент треска, а не в момент каста.
    ctx.playCleaveCrack?.()

    const liveCaster =
      (ctx.store?.placedTokens ?? []).find((token) => token?.uid === caster.uid) ?? caster
    const candidates = (ctx.store?.placedTokens ?? [])
      .filter((token) => token && token.uid !== liveCaster.uid)
      .filter((token) => !token.systemToken)
      .filter((token) => !isSameFaction(liveCaster, token))
      .filter((token) => phantomCellKeys.has(`${token.col ?? 0},${token.row ?? 0}`))

    if (!candidates.length) {
      ctx.store?.checkCombatEnd?.()
      return
    }

    let shouldEnterCombat = false
    for (const target of candidates) {
      if (isNeutralNpcToken(target)) {
        target.attitude = 'hostile'
        ctx.flash?.(target.uid, 'aggro', 700)
        spawnAggroFloat(ctx, target)
        shouldEnterCombat = true
      }
    }

    let combatHandoff = null
    if (
      !ctx.store?.combatMode &&
      shouldEnterCombat &&
      typeof ctx.enterCombatFromAbility === 'function'
    ) {
      combatHandoff = ctx.enterCombatFromAbility(liveCaster.uid, liveCaster.actionPoints ?? 0)
    }

    setTimeout(
      () => {
        applyMultiTargetDamage(
          ctx,
          candidates,
          () => {
            const roll = Math.floor(Math.random() * 6) + 1
            const base = Math.max(1, Math.round(roll + strength * strengthScaling))
            // Ярость берсерка: +50% урон если активна
            return Math.max(1, Math.round(base * getActiveDamageMult(liveCaster)))
          },
          ({ target, damage }) => {
            ctx.spawnDamage?.(target, damage, color)
          }
        )

        ctx.completeCombatHandoff?.(combatHandoff, ability)
      },
      shouldEnterCombat ? CLEAVE_AGGRO_LEAD_MS : 0
    )
  }, CLEAVE_CRACK_DELAY_MS)
}

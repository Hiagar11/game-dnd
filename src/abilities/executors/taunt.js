import { isSameFaction } from '../../utils/tokenFilters'
import { applyHostileAct } from '../../utils/combatTrigger'

export const ABILITY_ID = 'taunt'

/**
 * Провокация — цель следующие 2 хода обязана атаковать только кастера.
 * Применяется к врагу (враждебному NPC или герою — зависит от кастера). Стоит 1 AP.
 *
 * Хранится как activeEffect { id: 'taunt', byUid, remainingTurns: 2 }.
 * Проверка при атаке — в useTokenClickInteraction.js (getTauntEffect).
 */
export function execute(ctx, caster, target, ability) {
  // Нельзя провоцировать союзника — цель должна быть врагом кастера
  if (!target || isSameFaction(caster, target)) return

  const live = ctx.store.placedTokens.find((t) => t.uid === target.uid)
  const liveCaster = ctx.store.placedTokens.find((t) => t.uid === caster.uid)
  if (!live) return

  // Нейтральный противник, получивший провокацию, становится враждебным и вступает в бой
  if (
    applyHostileAct(ctx.store, liveCaster ?? caster, live) &&
    typeof ctx.enterCombatFromAbility === 'function'
  ) {
    ctx.enterCombatFromAbility(caster.uid, caster.actionPoints ?? 0)
  }

  // Применяем эффект провокации: remainingTurns убывает в tickTokenEffects
  ctx.addEffect(target, {
    id: 'taunt',
    name: 'Провокация',
    icon: ability?.icon ?? 'shouting',
    color: '#ef4444',
    remainingTurns: 2,
    byUid: caster.uid, // кастер — единственная допустимая цель атаки тонена
  })

  // Визуализация (4с):
  // 1) 0-2с: кастер наполняется красной яростью
  // 2) 2-4с: цель реагирует такой же красной анимацией
  if (liveCaster) {
    ctx.flash(liveCaster.uid, 'taunt', 2000)
  }
  ctx.playTauntCry?.()

  setTimeout(() => {
    ctx.flash(live.uid, 'taunt', 2000)
  }, 2000)

  // Плавающий текст над целью
  if (ctx.damageFloat?.value) {
    const hc = ctx.store.cellSize / 2
    const cx = (live.col + 1) * hc + ctx.store.gridNormOX
    const cy = (live.row + 1) * hc + ctx.store.gridNormOY
    setTimeout(() => {
      ctx.damageFloat.value?.spawn(live.uid, '⚑ Провокация', cx, cy, '#ef4444')
    }, 2100)
  }
}

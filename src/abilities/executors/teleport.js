export const ABILITY_ID = 'teleport'

/**
 * Телепортация — мгновенное перемещение на выбранную клетку.
 */
export function execute(ctx, caster, targetCell) {
  // Вспышка-растворение в точке отправления
  ctx.flash(caster.uid, 'teleport')

  // Перемещаем токен после короткой задержки (растворение)
  setTimeout(() => {
    ctx.store.moveToken(caster.uid, targetCell.col, targetCell.row)

    // Вспышка появления в точке прибытия
    ctx.flash(caster.uid, 'teleport')
  }, 200)
}

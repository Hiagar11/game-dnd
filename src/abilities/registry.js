// ─── Реестр экзекьюторов способностей ──────────────────────────────
// Автоматически подхватывает все файлы из ./executors/*.js
// Каждый модуль экспортирует:
//   ABILITY_ID  (string)   — один ID
//   ABILITY_IDS (string[]) — несколько ID (для общих экзекьюторов вроде AoE)
//   execute(ctx, caster, target, ability) — логика применения

const modules = import.meta.glob('./executors/*.js', { eager: true })

const EXECUTORS = {}

for (const mod of Object.values(modules)) {
  const ids = mod.ABILITY_IDS ?? (mod.ABILITY_ID ? [mod.ABILITY_ID] : [])
  for (const id of ids) {
    EXECUTORS[id] = mod.execute
  }
}

/**
 * Возвращает функцию-экзекьютор для способности по её ID.
 * @param {string} abilityId
 * @returns {Function|null} execute(ctx, caster, target, ability)
 */
export function getExecutor(abilityId) {
  return EXECUTORS[abilityId] ?? null
}

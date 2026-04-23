// ─── Нормализация пассивных способностей ─────────────────────────
// Источник может хранить пассивки как массив ID или как массив объектов ability.
// Эти хелперы приводят оба формата к единому виду и устраняют дубли.

export function passiveAbilityIdOf(entry) {
  if (!entry) return null
  if (typeof entry === 'string') return entry
  if (typeof entry === 'object' && typeof entry.id === 'string') return entry.id
  return null
}

export function normalizePassiveAbilityIds(passiveAbilities = []) {
  const unique = new Set()
  for (const entry of passiveAbilities) {
    const id = passiveAbilityIdOf(entry)
    if (id) unique.add(id)
  }
  return [...unique]
}

export function normalizePassiveAbilityEntries(passiveAbilities = [], resolveById) {
  const ids = normalizePassiveAbilityIds(passiveAbilities)
  if (typeof resolveById !== 'function') return ids
  return ids.map((id) => resolveById(id)).filter(Boolean)
}

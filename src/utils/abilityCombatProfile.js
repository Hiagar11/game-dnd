// ─── Профиль боя способности ─────────────────────────────────────
// Единая точка для определения типа доставки и боевых ограничений.
// Это заготовка под дальние атаки с проверкой линии огня и смешанные типы урона.

const DELIVERY_LABELS = {
  melee: 'Ближняя',
  ranged: 'Дальняя',
  self: 'На себя',
  utility: 'Вспомогательная',
}

const DAMAGE_KIND_LABELS = {
  physical: 'Физическая',
  magic: 'Магическая',
  mixed: 'Смешанная',
  none: 'Без урона',
}

export function getAbilityCombatProfile(ability) {
  const areaType = ability?.areaType ?? null
  const baseDelivery =
    areaType === 'self' || areaType === null ? 'self' : areaType === 'single' ? 'ranged' : 'utility'

  const delivery = ability?.delivery ?? (ability?.requiresMelee ? 'melee' : baseDelivery)
  const damageKind = ability?.damageKind ?? (ability?.type === 'passive' ? 'none' : 'physical')

  const requiresApproach = ability?.requiresApproach ?? delivery === 'melee'

  // По умолчанию линия огня нужна только для дальних не-магических атак.
  // Для магии можно явно переопределить requiresLineOfSight в abilityTree.
  const requiresLineOfSight =
    ability?.requiresLineOfSight ?? (delivery === 'ranged' && damageKind !== 'magic')

  return {
    delivery,
    damageKind,
    requiresApproach,
    requiresLineOfSight,
  }
}

export function getDeliveryLabel(delivery) {
  return DELIVERY_LABELS[delivery] ?? 'Неизвестно'
}

export function getDamageKindLabel(damageKind) {
  return DAMAGE_KIND_LABELS[damageKind] ?? 'Неизвестно'
}

export function getLineOfSightLabel(profile) {
  if (profile.delivery !== 'ranged') return null
  return profile.requiresLineOfSight ? 'Требует линию огня' : 'Без линии огня'
}

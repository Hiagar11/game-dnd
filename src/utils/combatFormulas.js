// Общие боевые формулы — используются в GameTokens.vue и GameCombatPopup.vue.
// Выделены сюда чтобы избежать дублирования и расхождения расчётов.

// Сложность броска на попадание (d20 + critChance >= HIT_DC → попал)
export const HIT_DC = 10

// ── Вторичные характеристики (по формулам из модели) ──────────────────────────

// Шанс критического попадания: бонус к броску d20
export function calcCritChance(t) {
  return Math.floor(((t?.agility ?? 0) * 2 + (t?.strength ?? 0)) / 5)
}

// Бонус урона: добавляется к броску d4
export function calcDamageBonus(t) {
  return Math.floor(((t?.strength ?? 0) * 2 + (t?.agility ?? 0)) / 5)
}

// Уклонение: снижает шанс быть поражённым
export function calcEvasion(t) {
  return Math.floor(((t?.agility ?? 0) * 3 + (t?.strength ?? 0)) / 5)
}

// Защита: снижает получаемый урон
export function calcDefense(t) {
  return Math.floor(((t?.strength ?? 0) + (t?.agility ?? 0)) / 4)
}

// Максимальное здоровье: база 10 + бонусы от силы и ловкости
export function calcMaxHp(strength = 0, agility = 0) {
  return 10 + strength * 2 + agility
}

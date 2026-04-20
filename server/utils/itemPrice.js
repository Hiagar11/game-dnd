/**
 * Серверная копия расчёта цены предмета.
 * Дублирует логику src/utils/itemPrice.js, но работает на Node (без import-алиасов).
 */

const RARITY_MULTIPLIER = {
  normal: 1,
  magic: 3,
  rare: 10,
  relic: 30,
}

const SLOT_BASE_PRICE = {
  weapon: 500,
  two_handed: 700,
  ranged: 600,
  magic_weapon: 800,
  helmet: 400,
  armor: 600,
  offhand: 350,
  gloves: 300,
  boots: 300,
  legs: 350,
  belt: 250,
  cloak: 300,
  amulet: 500,
  ring: 450,
  key: 2000,
  other: 300,
}

export function getItemPrice(item) {
  if (!item) return 0
  const basePrice = SLOT_BASE_PRICE[item.slot] ?? SLOT_BASE_PRICE.other
  const rarityMult = RARITY_MULTIPLIER[item.rarity] ?? 1
  const affixCount = Array.isArray(item.affixes) ? item.affixes.length : 0
  return Math.round(basePrice * rarityMult * (1 + affixCount * 0.3))
}

export function applyAttitudeDiscount(price, score) {
  const mult = score >= 0 ? 1 - score * 0.005 : 1 - score * 0.0167
  return Math.max(1, Math.round(price * mult))
}

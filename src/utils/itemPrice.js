/**
 * Автоматическая оценка стоимости предмета в медяках (copper).
 *
 * Формула:  basePrice × rarityMult × (1 + affixCount × 0.3)
 *
 * Номиналы для контекста:
 *   1 золотой   = 10 000 медяков
 *   1 серебряный = 100 медяков
 *
 * Примеры (ilvl 1):
 *   Обычный меч       →  500 copper  (5 серебряных)
 *   Магический меч     → 1 500 copper (15 серебряных)
 *   Редкий меч         → 5 000 copper (50 серебряных)
 *   Реликвия           → 15 000 copper (1.5 золотых)
 *   Ключ               →  2 000 copper (20 серебряных)
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

/**
 * Рассчитывает стоимость предмета в медяках.
 * @param {object} item — предмет из инвентаря (lootGenerator-формат или системный)
 * @returns {number} цена в медяках (copper)
 */
export function getItemPrice(item) {
  if (!item) return 0

  const basePrice = SLOT_BASE_PRICE[item.slot] ?? SLOT_BASE_PRICE.other
  const rarityMult = RARITY_MULTIPLIER[item.rarity] ?? 1
  const affixCount = Array.isArray(item.affixes) ? item.affixes.length : 0

  return Math.round(basePrice * rarityMult * (1 + affixCount * 0.3))
}

/**
 * Модификатор цены на основе отношения NPC к игроку.
 * Друзья делают скидку, враги задирают цену.
 * @param {number} price — базовая цена
 * @param {number} score — счёт отношений (-30..+60)
 * @returns {number} итоговая цена в медяках
 */
export function applyAttitudeDiscount(price, score) {
  // score -30 → ×1.5 (наценка 50%)
  // score   0 → ×1.0 (без изменений)
  // score +60 → ×0.7 (скидка 30%)
  const mult = score >= 0 ? 1 - score * 0.005 : 1 - score * 0.0167
  return Math.max(1, Math.round(price * mult))
}

const SLOT_LABELS = {
  weapon: 'Оружие',
  two_handed: 'Двуручное оружие',
  ranged: 'Дальнобойное оружие',
  magic_weapon: 'Магическое оружие',
  helmet: 'Шлем',
  armor: 'Броня',
  offhand: 'Щит / доп. рука',
  gloves: 'Перчатки',
  boots: 'Сапоги',
  legs: 'Поножи',
  belt: 'Пояс',
  cloak: 'Плащ',
  amulet: 'Амулет',
  ring: 'Кольцо',
  potion: 'Зелье',
  key: 'Ключ',
  other: 'Прочее',
}

const STAT_LABELS = {
  damage: 'Урон',
  hit_chance: 'Шанс удара',
  initiative: 'Инициатива',
  persuasion: 'Убеждение',
  deception: 'Обман',
  dodge: 'Уклонение',
  perception: 'Восприятие',
  magic_resist: 'Маг. сопр.',
  block: 'Блок',
  crit_damage: 'Крит. урон',
  armor_pen: 'Проб. брони',
  magic_pen: 'Проб. маг.',
  luck: 'Удача',
  stealth: 'Скрытность',
  healing: 'Лечение',
}

export function translateSlot(slot) {
  return SLOT_LABELS[slot] ?? slot ?? 'Предмет'
}

export function translateStat(stat) {
  return STAT_LABELS[stat?.toLowerCase()] ?? stat
}

export function translateElement(element) {
  switch (element) {
    case 'fire':
      return 'Огонь'
    case 'water':
      return 'Вода'
    case 'earth':
      return 'Земля'
    case 'air':
      return 'Воздух'
    default:
      return element ?? 'Стихия'
  }
}

export function traitData(traitId, traits = [], overrides = {}) {
  const trait = traits.find((x) => x.id === traitId)
  if (!trait) return { name: '', mods: [] }
  const modsSource = overrides[traitId] ?? trait.mods ?? []
  const mods = modsSource.map((mod) => ({
    text: `${translateStat(mod.stat)} ${mod.value >= 0 ? '+' : ''}${mod.value}`,
    positive: mod.value >= 0,
  }))
  return { name: trait.name, mods }
}

export function effectRows(item) {
  return (item?.effects ?? []).map((effect, index) => {
    switch (effect.kind) {
      case 'healing':
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [{ text: `Лечение +${effect.restoreHp} HP`, positive: true }],
        }
      case 'mana':
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [{ text: `Мана +${effect.restoreMana}`, positive: true }],
        }
      case 'poison_weapon_buff':
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [
            { text: `Яд: ${effect.poisonDamagePerTurn} урона/ход`, positive: true },
            { text: `${effect.turns} ход.`, positive: true },
          ],
        }
      case 'elemental_buff':
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [
            {
              text: `${translateElement(effect.element)} урон +${effect.bonusDamage}`,
              positive: true,
            },
            {
              text: `${translateElement(effect.element)} сопр. +${effect.resistance}`,
              positive: true,
            },
            { text: `${effect.turns} ход.`, positive: true },
          ],
        }
      case 'stamina': {
        const actionPointsText =
          effect.actionPoints?.mode === 'full'
            ? 'Очки действия: полностью'
            : effect.actionPoints?.mode === 'current_plus'
              ? `Очки действия: +${effect.actionPoints.value} к текущим`
              : `Очки действия: +${effect.actionPoints?.value ?? 0}`
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [{ text: actionPointsText, positive: true }],
        }
      }
      default:
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [{ text: 'Неизвестный эффект', positive: false }],
        }
    }
  })
}

/**
 * По слоту предмета находит снаряжённый предмет из `equipped`.
 * Возвращает null если ничего не найдено.
 */
const SLOT_TO_EQUIP_KEY = {
  helmet: ['helmet'],
  amulet: ['amulet'],
  cloak: ['cloak'],
  armor: ['armor'],
  weapon: ['weapon', 'weapon2'],
  magic_weapon: ['weapon', 'weapon2'],
  two_handed: ['weapon'],
  ranged: ['weapon'],
  offhand: ['offhand'],
  gloves: ['gloves'],
  belt: ['belt'],
  legs: ['legs'],
  boots: ['boots'],
  ring: ['ring-left', 'ring-right'],
}

export function findCompareItem(equipped, itemSlot) {
  const keys = SLOT_TO_EQUIP_KEY[itemSlot]
  if (!keys || !equipped) return null
  for (const key of keys) {
    if (equipped[key]) return equipped[key]
  }
  return null
}

export function buildTooltipRows(item) {
  const rows = []

  // Base weapon damage (диапазон урона оружия)
  if (item?.baseDamage) {
    rows.push({
      key: 'baseDamage',
      name: '',
      mods: [
        {
          text: `Урон ${item.baseDamage.min}–${item.baseDamage.max}`,
          positive: true,
        },
      ],
      implicit: true,
    })
  }

  // AP cost for heavy weapons
  if (item?.apCost && item.apCost > 1) {
    rows.push({
      key: 'apCost',
      name: '',
      mods: [
        {
          text: `Стоимость атаки: ${item.apCost} AP`,
          positive: false,
        },
      ],
      implicit: true,
    })
  }

  // Base armor (поглощение урона)
  if (item?.baseArmor) {
    rows.push({
      key: 'baseArmor',
      name: '',
      mods: [
        {
          text: `Броня ${item.baseArmor}`,
          positive: true,
        },
      ],
      implicit: true,
    })
  }

  // Implicit mod (встроенный)
  if (item?.implicit) {
    rows.push({
      key: 'implicit',
      name: '',
      mods: [
        { text: `${translateStat(item.implicit.stat)} +${item.implicit.value}`, positive: true },
      ],
      implicit: true,
    })
  }

  // Affixes (PoE-стиль)
  for (const [i, affix] of (item?.affixes ?? []).entries()) {
    rows.push({
      key: `affix_${i}`,
      name: affix.name,
      mods: [
        {
          text: `${translateStat(affix.stat)} ${affix.value >= 0 ? '+' : ''}${affix.value}`,
          positive: affix.value >= 0,
        },
      ],
    })
  }

  // Legacy effects (зелья и т.д.)
  rows.push(...effectRows(item))

  return rows
}

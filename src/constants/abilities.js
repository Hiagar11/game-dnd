// ─── Каталог способностей ──────────────────────────────────────────
// type        : 'active' — кнопка в action bar / 'passive' — постоянный эффект
// category    : 'combat' — боевая / 'utility' — мирная
// areaType    : 'targeted' — выбираем клетку, 'self' — вокруг себя, 'single' — одна цель, null — без цели
// areaSize    : радиус в клетках (0 = одиночная цель)
// icon        : имя из набора game-icons на Iconify (api.iconify.design/game-icons/<icon>.svg)

// ─── Боевые: урон по области (targeted AoE) ────────────────────────
export const GRAVITY_CRUSH = {
  id: 'gravity-crush',
  name: 'Гравитационное сжатие',
  description: 'Мощное гравитационное поле давит всех в выбранной области, нанося урон.',
  icon: 'black-hole-bolas',
  color: '#8b5cf6',
  apCost: 3,
  type: 'active',
  category: 'combat',
  areaType: 'targeted',
  areaSize: 2,
  areaLabel: 'Область 2 кл.',
}

export const GRAVITY_WELL = {
  id: 'gravity-well',
  name: 'Гравитационный колодец',
  description: 'Воронка гравитации стягивает всех к центру области и замедляет.',
  icon: 'magnet',
  color: '#6d28d9',
  apCost: 3,
  type: 'active',
  category: 'combat',
  areaType: 'targeted',
  areaSize: 2,
  areaLabel: 'Область 2 кл.',
}

export const BLOOD_RAIN = {
  id: 'blood-rain',
  name: 'Кровавый дождь',
  description:
    'Дождь из крови обрушивается на область. Кастер теряет 3 HP, но наносит урон всем врагам.',
  icon: 'blood',
  color: '#dc2626',
  apCost: 3,
  type: 'active',
  category: 'combat',
  areaType: 'targeted',
  areaSize: 2,
  areaLabel: 'Область 2 кл.',
}

export const POISON_CLOUD = {
  id: 'poison-cloud',
  name: 'Ядовитое облако',
  description: 'Облако ядовитого газа окутывает область. Отравляет всех, кто в нём находится.',
  icon: 'poison-gas',
  color: '#4ade80',
  apCost: 2,
  type: 'active',
  category: 'combat',
  areaType: 'targeted',
  areaSize: 2,
  areaLabel: 'Область 2 кл.',
}

// ─── Боевые: аура вокруг себя (self AoE) ───────────────────────────
export const BLOOD_NOVA = {
  id: 'blood-nova',
  name: 'Кровавая нова',
  description:
    'Взрыв крови вокруг вас. Кастер теряет 2 HP, враги рядом получают урон и кровотечение.',
  icon: 'bleeding-wound',
  color: '#dc2626',
  apCost: 2,
  type: 'active',
  category: 'combat',
  areaType: 'self',
  areaSize: 1,
  areaLabel: 'Вокруг себя 1 кл.',
}

export const GRAVITY_PULSE = {
  id: 'gravity-pulse',
  name: 'Гравитационный импульс',
  description: 'Мощная волна гравитации отталкивает всех врагов вокруг вас на 2 клетки.',
  icon: 'push',
  color: '#8b5cf6',
  apCost: 2,
  type: 'active',
  category: 'combat',
  areaType: 'self',
  areaSize: 1,
  areaLabel: 'Вокруг себя 1 кл.',
}

export const THORNS = {
  id: 'thorns',
  name: 'Шипы',
  description: 'Острые шипы пронзают землю вокруг вас, раня всех рядом.',
  icon: 'thorn-helix',
  color: '#22c55e',
  apCost: 2,
  type: 'active',
  category: 'combat',
  areaType: 'self',
  areaSize: 1,
  areaLabel: 'Вокруг себя 1 кл.',
}

// ─── Боевые: одиночная цель ────────────────────────────────────────
export const HEAL = {
  id: 'heal',
  name: 'Лечение',
  description: 'Восстанавливает здоровье выбранной цели. Чем выше интеллект — тем сильнее эффект.',
  icon: 'healing',
  color: '#34d399',
  apCost: 2,
  type: 'active',
  category: 'combat',
  areaType: 'single',
  areaSize: 0,
  areaLabel: 'Одна цель',
}

export const BLOOD_BOLT = {
  id: 'blood-bolt',
  name: 'Кровавый снаряд',
  description: 'Сгусток крови поражает цель. Кастер теряет 2 HP, но наносит повышенный урон.',
  icon: 'drop',
  color: '#dc2626',
  apCost: 2,
  type: 'active',
  category: 'combat',
  areaType: 'single',
  areaSize: 0,
  areaLabel: 'Одна цель',
}

export const GRAVITY_BOLT = {
  id: 'gravity-bolt',
  name: 'Гравитационный удар',
  description: 'Импульс гравитации поражает цель и притягивает её на 1 клетку к кастеру.',
  icon: 'magnet-blast',
  color: '#8b5cf6',
  apCost: 2,
  type: 'active',
  category: 'combat',
  areaType: 'single',
  areaSize: 0,
  areaLabel: 'Одна цель',
}

export const BLOOD_DRAIN = {
  id: 'blood-drain',
  name: 'Кровавое иссушение',
  description:
    'Вытягивает кровь из цели, нанося урон. Кастер восстанавливает 50% нанесённого урона.',
  icon: 'heart-minus',
  color: '#b91c1c',
  apCost: 2,
  type: 'active',
  category: 'combat',
  areaType: 'single',
  areaSize: 0,
  areaLabel: 'Одна цель',
}

export const POISON_STRIKE = {
  id: 'poison-strike',
  name: 'Отравление',
  description: 'Впрыскивает яд в цель. Цель получает урон каждый ход в течение 3 ходов.',
  icon: 'poison-bottle',
  color: '#4ade80',
  apCost: 2,
  type: 'active',
  category: 'combat',
  areaType: 'single',
  areaSize: 0,
  areaLabel: 'Одна цель',
}

// ─── Мирные (utility) ──────────────────────────────────────────────
export const DISGUISE = {
  id: 'disguise',
  name: 'Маскировка',
  description:
    'Принимаете облик выбранного токена. Замаскированный периодически мерцает, показывая истинный облик.',
  icon: 'domino-mask',
  color: '#94a3b8',
  apCost: 1,
  type: 'active',
  category: 'utility',
  areaType: 'single',
  areaSize: 0,
  areaLabel: 'Одна цель',
}

export const INVISIBILITY = {
  id: 'invisibility',
  name: 'Невидимость',
  description: 'Вы становитесь невидимым на 3 хода. Атака или способность снимают эффект.',
  icon: 'invisible',
  color: '#c4b5fd',
  apCost: 2,
  type: 'active',
  category: 'utility',
  areaType: null,
  areaSize: 0,
  areaLabel: 'На себя',
}

export const TELEPORT = {
  id: 'teleport',
  name: 'Телепортация',
  description: 'Мгновенно перемещаетесь в выбранную точку на карте в пределах дальности.',
  icon: 'teleport',
  color: '#818cf8',
  apCost: 3,
  type: 'active',
  category: 'utility',
  areaType: 'targeted',
  areaSize: 0,
  areaLabel: 'Точка на карте',
}

// ─── Пассивные ─────────────────────────────────────────────────────
export const REGENERATION = {
  id: 'regeneration',
  name: 'Регенерация',
  description: 'В начале каждого хода восстанавливает небольшое количество HP.',
  icon: 'regeneration',
  color: '#4ade80',
  apCost: 0,
  type: 'passive',
  category: 'combat',
  areaType: null,
  areaSize: 0,
  areaLabel: null,
}

export const DAMAGE_REFLECT = {
  id: 'damage-reflect',
  name: 'Отражение урона',
  description: 'Часть полученного урона возвращается атакующему.',
  icon: 'shield-reflect',
  color: '#60a5fa',
  apCost: 0,
  type: 'passive',
  category: 'combat',
  areaType: null,
  areaSize: 0,
  areaLabel: null,
}

export const GRAVITY_ANCHOR = {
  id: 'gravity-anchor',
  name: 'Гравитационный якорь',
  description:
    'Постоянное гравитационное поле снижает входящий урон и даёт иммунитет к перемещению.',
  icon: 'anchor',
  color: '#6d28d9',
  apCost: 0,
  type: 'passive',
  category: 'combat',
  areaType: null,
  areaSize: 0,
  areaLabel: null,
}

// ─── Сводные коллекции ─────────────────────────────────────────────
export const ALL_ABILITIES = [
  GRAVITY_CRUSH,
  GRAVITY_WELL,
  BLOOD_RAIN,
  POISON_CLOUD,
  BLOOD_NOVA,
  GRAVITY_PULSE,
  THORNS,
  HEAL,
  BLOOD_BOLT,
  GRAVITY_BOLT,
  BLOOD_DRAIN,
  POISON_STRIKE,
  DISGUISE,
  INVISIBILITY,
  TELEPORT,
  REGENERATION,
  DAMAGE_REFLECT,
  GRAVITY_ANCHOR,
]

export const ACTIVE_ABILITIES = ALL_ABILITIES.filter((a) => a.type === 'active')
export const PASSIVE_ABILITIES = ALL_ABILITIES.filter((a) => a.type === 'passive')
export const COMBAT_ABILITIES = ALL_ABILITIES.filter((a) => a.category === 'combat')
export const UTILITY_ABILITIES = ALL_ABILITIES.filter((a) => a.category === 'utility')

export function getAbilityById(id) {
  return ALL_ABILITIES.find((a) => a.id === id) ?? null
}

// ─── Дерево способностей ─────────────────────────────────────────
// Полный каталог из 55 способностей (43 базовые + 12 синергий).
// Каждая способность — заглушка: id, имя, тир, требования.
// Механика (урон, эффекты, анимация) добавляется поштучно по чеклисту.

// ─── Тир 1 — Базовые (одна характеристика ≥ 3) ─────────────────

export const POWER_STRIKE = {
  id: 'power_strike',
  name: 'Силовой удар',
  description:
    'Заменяет обычную атаку: наносит ×1.5 урона оружием ближнего боя. ' +
    'Стоимость = макс. из AP оружия и 2. Не работает с луком и жезлом.',
  icon: 'broadsword',
  color: '#ef4444',
  apCost: 2,
  type: 'active',
  tier: 1,
  areaType: 'single',
  requiresMelee: true,
  damageMultiplier: 1.5,
  requirements: { strength: 3, agility: 0, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const SHIELD_BASH = {
  id: 'shield_bash',
  name: 'Удар щитом',
  description: 'Оглушение цели на 1 ход. Требует щит в оффхенде.',
  icon: 'shield-bash',
  color: '#f59e0b',
  apCost: 1,
  type: 'active',
  tier: 1,
  areaType: 'single',
  requiresMelee: true,
  requiresShield: true,
  requirements: { strength: 3, agility: 0, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const QUICK_STEP = {
  id: 'quick_step',
  name: 'Быстрый шаг',
  description: '+3 MP на этот ход.',
  icon: 'run',
  color: '#22c55e',
  apCost: 1,
  type: 'active',
  tier: 1,
  requirements: { strength: 0, agility: 3, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const DODGE_ROLL = {
  id: 'dodge_roll',
  name: 'Перекат',
  description: '+2 к уклонению (постоянно).',
  icon: 'body-balance',
  color: '#22c55e',
  apCost: 0,
  type: 'passive',
  tier: 1,
  requirements: { strength: 0, agility: 3, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const BLOOD_BOLT = {
  id: 'blood_bolt',
  name: 'Кровавый снаряд',
  description: 'd8 + INT урона, кастер −2 HP.',
  icon: 'drop',
  color: '#dc2626',
  apCost: 2,
  type: 'active',
  tier: 1,
  requirements: { strength: 0, agility: 0, intellect: 3, charisma: 0 },
  requiredAbilities: [],
}

export const MANA_SENSE = {
  id: 'mana_sense',
  name: 'Чутьё маны',
  description: '+2 к восприятию (постоянно).',
  icon: 'third-eye',
  color: '#8b5cf6',
  apCost: 0,
  type: 'passive',
  tier: 1,
  requirements: { strength: 0, agility: 0, intellect: 3, charisma: 0 },
  requiredAbilities: [],
}

export const INSPIRE = {
  id: 'inspire',
  name: 'Воодушевление',
  description: 'Союзник получает +1 AP на свой ход.',
  icon: 'rally-the-troops',
  color: '#eab308',
  apCost: 2,
  type: 'active',
  tier: 1,
  requirements: { strength: 0, agility: 0, intellect: 0, charisma: 3 },
  requiredAbilities: [],
}

export const TAUNT = {
  id: 'taunt',
  name: 'Провокация',
  description: 'Враг атакует только тебя 2 хода.',
  icon: 'shouting',
  color: '#eab308',
  apCost: 1,
  type: 'active',
  tier: 1,
  requirements: { strength: 0, agility: 0, intellect: 0, charisma: 3 },
  requiredAbilities: [],
}

// ─── Тир 2 — Продвинутые (два стата ≥ 3 или один ≥ 5) ──────────

export const CLEAVE = {
  id: 'cleave',
  name: 'Раскол',
  description: 'Урон по 2 соседним целям.',
  icon: 'axe-swing',
  color: '#ef4444',
  apCost: 3,
  type: 'active',
  tier: 2,
  requirements: { strength: 5, agility: 0, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const BERSERKER_RAGE = {
  id: 'berserker_rage',
  name: 'Ярость берсерка',
  description: '+50% урон, −20% уклонение, 3 хода.',
  icon: 'enrage',
  color: '#ef4444',
  apCost: 2,
  type: 'active',
  tier: 2,
  requirements: { strength: 3, agility: 3, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const CHARGE = {
  id: 'charge',
  name: 'Рывок',
  description: 'Прыжок на 4 клетки + удар.',
  icon: 'charging-bull',
  color: '#ef4444',
  apCost: 3,
  type: 'active',
  tier: 2,
  requirements: { strength: 3, agility: 3, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const BACKSTAB = {
  id: 'backstab',
  name: 'Удар в спину',
  description: '×2 урона если цель не видит тебя.',
  icon: 'backstab',
  color: '#22c55e',
  apCost: 2,
  type: 'active',
  tier: 2,
  requirements: { strength: 0, agility: 5, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const SHADOW_STEP = {
  id: 'shadow_step',
  name: 'Теневой шаг',
  description: 'Телепорт за спину врага (2 кл.).',
  icon: 'ninja-heroic-stance',
  color: '#6366f1',
  apCost: 2,
  type: 'active',
  tier: 2,
  requirements: { strength: 0, agility: 3, intellect: 3, charisma: 0 },
  requiredAbilities: [],
}

export const POISON_BLADE = {
  id: 'poison_blade',
  name: 'Ядовитый клинок',
  description: 'Яд 3 хода (2 + INT×0.5 за ход).',
  icon: 'poison-bottle',
  color: '#4ade80',
  apCost: 2,
  type: 'active',
  tier: 2,
  requirements: { strength: 0, agility: 3, intellect: 3, charisma: 0 },
  requiredAbilities: [],
}

export const GRAVITY_CRUSH = {
  id: 'gravity_crush',
  name: 'Грав. сжатие',
  description: 'AoE гравитация, радиус 2.',
  icon: 'black-hole-bolas',
  color: '#8b5cf6',
  apCost: 3,
  type: 'active',
  tier: 2,
  requirements: { strength: 0, agility: 0, intellect: 5, charisma: 0 },
  requiredAbilities: [],
}

export const GRAVITY_BOLT = {
  id: 'gravity_bolt',
  name: 'Грав. удар',
  description: 'd8+INT + притягивание на 1 кл.',
  icon: 'magnet-blast',
  color: '#8b5cf6',
  apCost: 2,
  type: 'active',
  tier: 2,
  requirements: { strength: 0, agility: 0, intellect: 3, charisma: 3 },
  requiredAbilities: [],
}

export const HEAL = {
  id: 'heal',
  name: 'Исцеление',
  description: '5 + INT×1.5 HP союзнику.',
  icon: 'healing',
  color: '#34d399',
  apCost: 2,
  type: 'active',
  tier: 2,
  requirements: { strength: 0, agility: 0, intellect: 3, charisma: 3 },
  requiredAbilities: [],
}

export const BATTLE_CRY = {
  id: 'battle_cry',
  name: 'Боевой клич',
  description: 'Союзники в 2 кл. получают +2 урон, 2 хода.',
  icon: 'rally-the-troops',
  color: '#f59e0b',
  apCost: 2,
  type: 'active',
  tier: 2,
  requirements: { strength: 3, agility: 0, intellect: 0, charisma: 3 },
  requiredAbilities: [],
}

export const INTIMIDATE = {
  id: 'intimidate',
  name: 'Запугивание',
  description: 'Враг теряет 1 AP на 2 хода.',
  icon: 'screaming',
  color: '#f59e0b',
  apCost: 2,
  type: 'active',
  tier: 2,
  requirements: { strength: 3, agility: 0, intellect: 0, charisma: 3 },
  requiredAbilities: [],
}

// ─── Тир 3 — Экспертные (два стата ≥ 5 или три ≥ 3) ────────────

export const WHIRLWIND = {
  id: 'whirlwind',
  name: 'Вихрь клинков',
  description: 'Урон всем в 1 кл. вокруг.',
  icon: 'spinning-sword',
  color: '#ef4444',
  apCost: 3,
  type: 'active',
  tier: 3,
  requirements: { strength: 5, agility: 3, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const STUNNING_BLOW = {
  id: 'stunning_blow',
  name: 'Оглушающий удар',
  description: 'Урон + оглушение на 1 ход (100% шанс).',
  icon: 'hammer-drop',
  color: '#ef4444',
  apCost: 3,
  type: 'active',
  tier: 3,
  requirements: { strength: 5, agility: 3, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const IRON_SKIN = {
  id: 'iron_skin',
  name: 'Железная кожа',
  description: '+3 к блоку (постоянно).',
  icon: 'abdominal-armor',
  color: '#94a3b8',
  apCost: 0,
  type: 'passive',
  tier: 3,
  requirements: { strength: 5, agility: 0, intellect: 0, charisma: 3 },
  requiredAbilities: [],
}

export const INVISIBILITY = {
  id: 'invisibility',
  name: 'Невидимость',
  description: 'Невидимость 3 хода.',
  icon: 'invisible',
  color: '#c4b5fd',
  apCost: 2,
  type: 'active',
  tier: 3,
  requirements: { strength: 0, agility: 5, intellect: 3, charisma: 0 },
  requiredAbilities: [],
}

export const BLOOD_LEECH = {
  id: 'blood_leech',
  name: 'Кров. иссушение',
  description: 'Урон 3 целям, кастер хилится 50%.',
  icon: 'heart-minus',
  color: '#dc2626',
  apCost: 3,
  type: 'active',
  tier: 3,
  requirements: { strength: 0, agility: 3, intellect: 5, charisma: 0 },
  requiredAbilities: [],
}

export const EVASION_MASTER = {
  id: 'evasion_master',
  name: 'Мастер уклонений',
  description: '+3 к уклонению (постоянно).',
  icon: 'dodging',
  color: '#22c55e',
  apCost: 0,
  type: 'passive',
  tier: 3,
  requirements: { strength: 0, agility: 5, intellect: 0, charisma: 3 },
  requiredAbilities: [],
}

export const DISGUISE = {
  id: 'disguise',
  name: 'Маскировка',
  description: 'Принять облик другого токена.',
  icon: 'domino-mask',
  color: '#94a3b8',
  apCost: 2,
  type: 'active',
  tier: 3,
  requirements: { strength: 0, agility: 5, intellect: 0, charisma: 3 },
  requiredAbilities: [],
}

export const GRAVITY_WELL = {
  id: 'gravity_well',
  name: 'Грав. колодец',
  description: 'AoE воронка: стягивает + замедл.',
  icon: 'magnet',
  color: '#6d28d9',
  apCost: 3,
  type: 'active',
  tier: 3,
  requirements: { strength: 0, agility: 0, intellect: 5, charisma: 3 },
  requiredAbilities: [],
}

export const TELEPORT = {
  id: 'teleport',
  name: 'Телепорт',
  description: 'Перемещение на любую видимую клетку.',
  icon: 'teleport',
  color: '#818cf8',
  apCost: 2,
  type: 'active',
  tier: 3,
  requirements: { strength: 0, agility: 0, intellect: 5, charisma: 3 },
  requiredAbilities: [],
}

export const GRAVITY_SHIELD = {
  id: 'gravity_shield',
  name: 'Грав. щит',
  description: 'Отклоняет снаряды: −5 дальнего урона/ход.',
  icon: 'shield',
  color: '#8b5cf6',
  apCost: 0,
  type: 'passive',
  tier: 3,
  requirements: { strength: 0, agility: 0, intellect: 5, charisma: 5 },
  requiredAbilities: [],
}

export const RALLYING_SPEECH = {
  id: 'rallying_speech',
  name: 'Вдохновляющая речь',
  description: 'Все союзники в 3 кл. получают +3 HP и +1 AP.',
  icon: 'public-speaker',
  color: '#eab308',
  apCost: 3,
  type: 'active',
  tier: 3,
  requirements: { strength: 0, agility: 0, intellect: 3, charisma: 5 },
  requiredAbilities: [],
}

export const COUNTER_ATTACK = {
  id: 'counter_attack',
  name: 'Контратака',
  description: 'Шанс 30% ответить ударом при получении урона.',
  icon: 'sword-clash',
  color: '#22c55e',
  apCost: 0,
  type: 'passive',
  tier: 3,
  requirements: { strength: 3, agility: 5, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

// ─── Тир 4 — Мастерские (один стат ≥ 7 или три стата ≥ 5) ──────

export const EARTHQUAKE = {
  id: 'earthquake',
  name: 'Землетрясение',
  description: 'AoE 3 кл., урон + сбивает с ног.',
  icon: 'earth-crack',
  color: '#ef4444',
  apCost: 4,
  type: 'active',
  tier: 4,
  requirements: { strength: 7, agility: 0, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const BLADE_DANCE = {
  id: 'blade_dance',
  name: 'Танец клинков',
  description: '3 удара по случайным целям в 2 кл.',
  icon: 'blade-fall',
  color: '#22c55e',
  apCost: 4,
  type: 'active',
  tier: 4,
  requirements: { strength: 0, agility: 7, intellect: 0, charisma: 0 },
  requiredAbilities: [],
}

export const SINGULARITY = {
  id: 'singularity',
  name: 'Сингулярность',
  description: 'AoE 3 кл., стягивает к центру + урон.',
  icon: 'black-hole-bolas',
  color: '#7c3aed',
  apCost: 4,
  type: 'active',
  tier: 4,
  requirements: { strength: 0, agility: 0, intellect: 7, charisma: 0 },
  requiredAbilities: [],
}

export const MASS_CHARM = {
  id: 'mass_charm',
  name: 'Массовое очарование',
  description: 'Все враги в 2 кл. пропускают ход.',
  icon: 'charm',
  color: '#eab308',
  apCost: 4,
  type: 'active',
  tier: 4,
  requirements: { strength: 0, agility: 0, intellect: 0, charisma: 7 },
  requiredAbilities: [],
}

export const BLOOD_RAGE = {
  id: 'blood_rage',
  name: 'Кровавая ярость',
  description: 'Жертва 25%HP, ×3 урон один удар.',
  icon: 'bloody-sword',
  color: '#dc2626',
  apCost: 3,
  type: 'active',
  tier: 4,
  requirements: { strength: 5, agility: 0, intellect: 5, charisma: 0 },
  requiredAbilities: [],
}

export const SHADOW_ASSASSIN = {
  id: 'shadow_assassin',
  name: 'Теневой убийца',
  description: 'Крит из невидимости даёт ×3 урона вместо ×2.',
  icon: 'hooded-assassin',
  color: '#6366f1',
  apCost: 0,
  type: 'passive',
  tier: 4,
  requirements: { strength: 0, agility: 5, intellect: 5, charisma: 0 },
  requiredAbilities: [],
}

export const PALADIN_AURA = {
  id: 'paladin_aura',
  name: 'Аура паладина',
  description: 'Союзники в 2 кл. получают +2 к блоку и +2 HP/ход.',
  icon: 'aura',
  color: '#f59e0b',
  apCost: 0,
  type: 'passive',
  tier: 4,
  requirements: { strength: 5, agility: 0, intellect: 0, charisma: 5 },
  requiredAbilities: [],
}

export const TRICKSTER_GAMBIT = {
  id: 'trickster_gambit',
  name: 'Гамбит трикстера',
  description: 'Меняешься местами с любым токеном в 5 кл.',
  icon: 'jester-hat',
  color: '#eab308',
  apCost: 2,
  type: 'active',
  tier: 4,
  requirements: { strength: 0, agility: 5, intellect: 0, charisma: 5 },
  requiredAbilities: [],
}

export const DAMAGE_REFLECT = {
  id: 'damage_reflect',
  name: 'Отражение урона',
  description: '20% урона возвращается атакующему.',
  icon: 'shield-reflect',
  color: '#60a5fa',
  apCost: 0,
  type: 'passive',
  tier: 4,
  requirements: { strength: 5, agility: 0, intellect: 3, charisma: 3 },
  requiredAbilities: [],
}

export const REGENERATION = {
  id: 'regeneration',
  name: 'Регенерация',
  description: '+3 HP за ход (постоянно).',
  icon: 'regeneration',
  color: '#4ade80',
  apCost: 0,
  type: 'passive',
  tier: 4,
  requirements: { strength: 3, agility: 0, intellect: 5, charisma: 3 },
  requiredAbilities: [],
}

export const GRAVITY_ANCHOR = {
  id: 'gravity_anchor',
  name: 'Грав. якорь',
  description: '−3 вход. урон + иммунитет к перемещению.',
  icon: 'anchor',
  color: '#6d28d9',
  apCost: 0,
  type: 'passive',
  tier: 4,
  requirements: { strength: 0, agility: 3, intellect: 5, charisma: 3 },
  requiredAbilities: [],
}

export const BATTLE_COMMANDER = {
  id: 'battle_commander',
  name: 'Полководец',
  description: 'Все союзники получают доп. ход.',
  icon: 'throne-king',
  color: '#eab308',
  apCost: 5,
  type: 'active',
  tier: 4,
  requirements: { strength: 3, agility: 3, intellect: 3, charisma: 5 },
  requiredAbilities: [],
}

// ─── Тир S — Синергии (требуют активированные пререквизиты) ─────

export const BLOOD_GRAVITY_ARROW = {
  id: 'blood_gravity_arrow',
  name: 'Кровавая грав. стрела',
  description: 'Управляемый снаряд: d12+INT, притяг. + вампиризм 30%.',
  icon: 'arrow-dunk',
  color: '#a855f7',
  apCost: 3,
  type: 'active',
  tier: 'S',
  requirements: { strength: 0, agility: 0, intellect: 5, charisma: 0 },
  requiredAbilities: ['blood_bolt', 'gravity_bolt'],
}

export const BLOOD_VORTEX = {
  id: 'blood_vortex',
  name: 'Кровавая воронка',
  description: 'AoE 3 кл: стягивает + хилит кастера за каждую цель.',
  icon: 'fire-ring',
  color: '#a855f7',
  apCost: 4,
  type: 'active',
  tier: 'S',
  requirements: { strength: 0, agility: 0, intellect: 7, charisma: 0 },
  requiredAbilities: ['blood_leech', 'gravity_well'],
}

export const GRAVITY_STORM = {
  id: 'gravity_storm',
  name: 'Грав. буря',
  description: 'Ульта: AoE 4 кл, стягивает + давит 3 хода подряд.',
  icon: 'tornado',
  color: '#7c3aed',
  apCost: 5,
  type: 'active',
  tier: 'S',
  requirements: { strength: 0, agility: 0, intellect: 7, charisma: 0 },
  requiredAbilities: ['singularity', 'gravity_well'],
}

export const GRAVITATIONAL_BLADE = {
  id: 'gravitational_blade',
  name: 'Грав. клинок',
  description: 'Притягивает цель + мгновенный удар ×2.5.',
  icon: 'daggers',
  color: '#a855f7',
  apCost: 3,
  type: 'active',
  tier: 'S',
  requirements: { strength: 0, agility: 5, intellect: 3, charisma: 0 },
  requiredAbilities: ['gravity_bolt', 'backstab'],
}

export const WARP_STRIKE = {
  id: 'warp_strike',
  name: 'Варп-удар',
  description: 'Телепорт к цели + AoE гравитация в точке приземления.',
  icon: 'teleport',
  color: '#a855f7',
  apCost: 4,
  type: 'active',
  tier: 'S',
  requirements: { strength: 0, agility: 3, intellect: 5, charisma: 0 },
  requiredAbilities: ['shadow_step', 'gravity_crush'],
}

export const IMMOVABLE_FORTRESS = {
  id: 'immovable_fortress',
  name: 'Несокрушимая крепость',
  description: '−5 входящ. урон + иммунитет к перемещению + отражение 10%.',
  icon: 'castle',
  color: '#94a3b8',
  apCost: 0,
  type: 'passive',
  tier: 'S',
  requirements: { strength: 5, agility: 0, intellect: 5, charisma: 0 },
  requiredAbilities: ['iron_skin', 'gravity_anchor'],
}

export const BLOOD_FRENZY = {
  id: 'blood_frenzy',
  name: 'Кровавое безумие',
  description: 'Жертва 30%HP: ×4 урон 2 удара + иммунитет к контролю.',
  icon: 'decapitation',
  color: '#dc2626',
  apCost: 4,
  type: 'active',
  tier: 'S',
  requirements: { strength: 5, agility: 0, intellect: 5, charisma: 0 },
  requiredAbilities: ['blood_rage', 'berserker_rage'],
}

export const PHANTOM_STRIKE = {
  id: 'phantom_strike',
  name: 'Фантомный удар',
  description: 'Из невидимости: крит ×3 + оглушение 1 ход.',
  icon: 'ghost',
  color: '#c4b5fd',
  apCost: 3,
  type: 'active',
  tier: 'S',
  requirements: { strength: 0, agility: 5, intellect: 3, charisma: 0 },
  requiredAbilities: ['invisibility', 'backstab'],
}

export const SHADOW_GRAVITY = {
  id: 'shadow_gravity',
  name: 'Теневой коллапс',
  description: 'Из невидимости: незаметная AoE гравитация ×2 урон.',
  icon: 'shadow-grasp',
  color: '#7c3aed',
  apCost: 4,
  type: 'active',
  tier: 'S',
  requirements: { strength: 0, agility: 5, intellect: 5, charisma: 0 },
  requiredAbilities: ['invisibility', 'gravity_crush'],
}

export const BLOOD_TRANSFUSION = {
  id: 'blood_transfusion',
  name: 'Переливание крови',
  description: 'Кастер −30%HP, союзник получает ×2 от потерянного.',
  icon: 'heart-plus',
  color: '#dc2626',
  apCost: 2,
  type: 'active',
  tier: 'S',
  requirements: { strength: 0, agility: 0, intellect: 5, charisma: 3 },
  requiredAbilities: ['blood_bolt', 'heal'],
}

export const BLOOD_PACT = {
  id: 'blood_pact',
  name: 'Кровавый договор',
  description: 'Кастер −20%HP, союзники в 3 кл: +3AP +30%урон 2 хода.',
  icon: 'bloody-stash',
  color: '#dc2626',
  apCost: 4,
  type: 'active',
  tier: 'S',
  requirements: { strength: 0, agility: 0, intellect: 5, charisma: 5 },
  requiredAbilities: ['blood_leech', 'rallying_speech'],
}

export const WAR_AVATAR = {
  id: 'war_avatar',
  name: 'Аватар войны',
  description: 'Ульта: +2AP +3блок +3урон всем союзникам на 3 хода.',
  icon: 'crowned-skull',
  color: '#f59e0b',
  apCost: 5,
  type: 'active',
  tier: 'S',
  requirements: { strength: 5, agility: 0, intellect: 0, charisma: 5 },
  requiredAbilities: ['paladin_aura', 'battle_commander'],
}

// ─── Сводные коллекции ──────────────────────────────────────────

export const ABILITY_TREE = [
  // Тир 1
  POWER_STRIKE,
  SHIELD_BASH,
  QUICK_STEP,
  DODGE_ROLL,
  BLOOD_BOLT,
  MANA_SENSE,
  INSPIRE,
  TAUNT,
  // Тир 2
  CLEAVE,
  BERSERKER_RAGE,
  CHARGE,
  BACKSTAB,
  SHADOW_STEP,
  POISON_BLADE,
  GRAVITY_CRUSH,
  GRAVITY_BOLT,
  HEAL,
  BATTLE_CRY,
  INTIMIDATE,
  // Тир 3
  WHIRLWIND,
  STUNNING_BLOW,
  IRON_SKIN,
  INVISIBILITY,
  BLOOD_LEECH,
  EVASION_MASTER,
  DISGUISE,
  GRAVITY_WELL,
  TELEPORT,
  GRAVITY_SHIELD,
  RALLYING_SPEECH,
  COUNTER_ATTACK,
  // Тир 4
  EARTHQUAKE,
  BLADE_DANCE,
  SINGULARITY,
  MASS_CHARM,
  BLOOD_RAGE,
  SHADOW_ASSASSIN,
  PALADIN_AURA,
  TRICKSTER_GAMBIT,
  DAMAGE_REFLECT,
  REGENERATION,
  GRAVITY_ANCHOR,
  BATTLE_COMMANDER,
  // Тир S
  BLOOD_GRAVITY_ARROW,
  BLOOD_VORTEX,
  GRAVITY_STORM,
  GRAVITATIONAL_BLADE,
  WARP_STRIKE,
  IMMOVABLE_FORTRESS,
  BLOOD_FRENZY,
  PHANTOM_STRIKE,
  SHADOW_GRAVITY,
  BLOOD_TRANSFUSION,
  BLOOD_PACT,
  WAR_AVATAR,
]

// Группировка по тирам — для UI дерева
export const TIERS = [1, 2, 3, 4, 'S']

export const TIER_LABELS = {
  1: 'Тир 1 — Базовые',
  2: 'Тир 2 — Продвинутые',
  3: 'Тир 3 — Экспертные',
  4: 'Тир 4 — Мастерские',
  S: 'Тир S — Синергии',
}

export const TIER_COLORS = {
  1: '#3b82f6',
  2: '#22c55e',
  3: '#f97316',
  4: '#ef4444',
  S: '#d946ef',
}

export function getAbilityTreeById(id) {
  return ABILITY_TREE.find((a) => a.id === id) ?? null
}

export function getAbilitiesByTier(tier) {
  return ABILITY_TREE.filter((a) => a.tier === tier)
}

// ─── Классификация активных способностей по типу цели ────────────
// Используется вкладками каталога: По области / По цели / Специальное / Мирные
// Пассивные (type === 'passive') фильтруются отдельно.
export const ABILITY_TARGET_MAP = {
  // aoe — по области
  cleave: 'aoe',
  gravity_crush: 'aoe',
  battle_cry: 'aoe',
  whirlwind: 'aoe',
  blood_leech: 'aoe',
  gravity_well: 'aoe',
  rallying_speech: 'aoe',
  earthquake: 'aoe',
  blade_dance: 'aoe',
  singularity: 'aoe',
  mass_charm: 'aoe',
  battle_commander: 'aoe',
  blood_vortex: 'aoe',
  gravity_storm: 'aoe',
  warp_strike: 'aoe',
  shadow_gravity: 'aoe',
  blood_pact: 'aoe',
  war_avatar: 'aoe',

  // single — по цели
  power_strike: 'single',
  shield_bash: 'single',
  blood_bolt: 'single',
  taunt: 'single',
  charge: 'single',
  backstab: 'single',
  poison_blade: 'single',
  gravity_bolt: 'single',
  intimidate: 'single',
  stunning_blow: 'single',
  blood_gravity_arrow: 'single',
  gravitational_blade: 'single',
  phantom_strike: 'single',

  // self — специальное (самобафф / перемещение)
  quick_step: 'self',
  berserker_rage: 'self',
  shadow_step: 'self',
  invisibility: 'self',
  teleport: 'self',
  blood_rage: 'self',
  blood_frenzy: 'self',

  // utility — мирные / поддержка
  inspire: 'utility',
  heal: 'utility',
  disguise: 'utility',
  trickster_gambit: 'utility',
  blood_transfusion: 'utility',
}

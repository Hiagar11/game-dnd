const SEED_VERSION = '9'

export function seedDemoData() {
  const now = Date.now()
  let counter = 1
  const tid = () => `trait_seed_${now}_${counter++}`
  const iid = () => `item_seed_${now}_${counter++}`

  // ── Все свойства чисто положительные, категории — 4 стихии ────────────
  const traits = [
    // ── fire (Огонь) — урон, шанс удара ──────────────────────────────────
    {
      id: tid(),
      name: 'Пламенный клинок',
      category: 'fire',
      icon: 'broadsword',
      mods: [{ stat: 'damage', value: 3 }],
    },
    {
      id: tid(),
      name: 'Жар битвы',
      category: 'fire',
      icon: 'fire',
      mods: [
        { stat: 'damage', value: 2 },
        { stat: 'hit_chance', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Испепеление',
      category: 'fire',
      icon: 'battle-axe',
      mods: [{ stat: 'damage', value: 4 }],
    },
    {
      id: tid(),
      name: 'Точность огня',
      category: 'fire',
      icon: 'arrow-cluster',
      mods: [{ stat: 'hit_chance', value: 3 }],
    },
    {
      id: tid(),
      name: 'Огненная ярость',
      category: 'fire',
      icon: 'swords-power',
      mods: [
        { stat: 'damage', value: 3 },
        { stat: 'hit_chance', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Обжигающий удар',
      category: 'fire',
      icon: 'stiletto',
      mods: [
        { stat: 'damage', value: 2 },
        { stat: 'initiative', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Пылающая мощь',
      category: 'fire',
      icon: 'warhammer',
      mods: [{ stat: 'damage', value: 5 }],
    },
    {
      id: tid(),
      name: 'Искры меткости',
      category: 'fire',
      icon: 'hatchet',
      mods: [
        { stat: 'hit_chance', value: 2 },
        { stat: 'damage', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Вспышка',
      category: 'fire',
      icon: 'fire',
      mods: [
        { stat: 'hit_chance', value: 4 },
        { stat: 'initiative', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Раскалённая сталь',
      category: 'fire',
      icon: 'pointy-sword',
      mods: [
        { stat: 'damage', value: 3 },
        { stat: 'magic_power', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Жаровня войны',
      category: 'fire',
      icon: 'chest-armor',
      mods: [
        { stat: 'damage', value: 1 },
        { stat: 'hit_chance', value: 1 },
        { stat: 'initiative', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Огненный взор',
      category: 'fire',
      icon: 'all-seeing-eye',
      mods: [
        { stat: 'hit_chance', value: 3 },
        { stat: 'persuasion', value: 1 },
      ],
    },

    // ── earth (Земля) — защита, сопротивление ────────────────────────────
    {
      id: tid(),
      name: 'Каменная кожа',
      category: 'earth',
      icon: 'shield',
      mods: [{ stat: 'defense', value: 3 }],
    },
    {
      id: tid(),
      name: 'Твердыня',
      category: 'earth',
      icon: 'chest-armor',
      mods: [
        { stat: 'defense', value: 2 },
        { stat: 'resistance', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Горная стойкость',
      category: 'earth',
      icon: 'rune-stone',
      mods: [{ stat: 'resistance', value: 4 }],
    },
    {
      id: tid(),
      name: 'Щит титана',
      category: 'earth',
      icon: 'shield',
      mods: [{ stat: 'defense', value: 5 }],
    },
    {
      id: tid(),
      name: 'Песчаный барьер',
      category: 'earth',
      icon: 'helmet',
      mods: [
        { stat: 'defense', value: 3 },
        { stat: 'resistance', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Земляной панцирь',
      category: 'earth',
      icon: 'chest-armor',
      mods: [
        { stat: 'defense', value: 4 },
        { stat: 'resistance', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Корни древних',
      category: 'earth',
      icon: 'rune-stone',
      mods: [
        { stat: 'resistance', value: 3 },
        { stat: 'defense', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Гранитная воля',
      category: 'earth',
      icon: 'dinosaur-bones',
      mods: [{ stat: 'resistance', value: 3 }],
    },
    {
      id: tid(),
      name: 'Оплот земли',
      category: 'earth',
      icon: 'shield',
      mods: [
        { stat: 'defense', value: 2 },
        { stat: 'resistance', value: 1 },
        { stat: 'dodge', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Несокрушимость',
      category: 'earth',
      icon: 'gauntlet',
      mods: [
        { stat: 'defense', value: 3 },
        { stat: 'hit_chance', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Каменный оплот',
      category: 'earth',
      icon: 'helmet',
      mods: [
        { stat: 'defense', value: 1 },
        { stat: 'resistance', value: 3 },
      ],
    },
    {
      id: tid(),
      name: 'Землетрясение',
      category: 'earth',
      icon: 'warhammer',
      mods: [
        { stat: 'defense', value: 2 },
        { stat: 'damage', value: 2 },
      ],
    },

    // ── water (Вода) — уклонение, инициатива ─────────────────────────────
    {
      id: tid(),
      name: 'Водная гибкость',
      category: 'water',
      icon: 'boot-stomp',
      mods: [{ stat: 'dodge', value: 3 }],
    },
    {
      id: tid(),
      name: 'Поток',
      category: 'water',
      icon: 'ghost',
      mods: [
        { stat: 'dodge', value: 2 },
        { stat: 'initiative', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Речная скорость',
      category: 'water',
      icon: 'boot-stomp',
      mods: [{ stat: 'initiative', value: 4 }],
    },
    {
      id: tid(),
      name: 'Туманный шаг',
      category: 'water',
      icon: 'ghost',
      mods: [
        { stat: 'dodge', value: 4 },
        { stat: 'initiative', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Приливная волна',
      category: 'water',
      icon: 'crystal-ball',
      mods: [
        { stat: 'initiative', value: 3 },
        { stat: 'dodge', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Скользящий удар',
      category: 'water',
      icon: 'stiletto',
      mods: [
        { stat: 'dodge', value: 2 },
        { stat: 'hit_chance', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Ледяное спокойствие',
      category: 'water',
      icon: 'ice-bolt',
      mods: [
        { stat: 'initiative', value: 2 },
        { stat: 'resistance', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Морской ветер',
      category: 'water',
      icon: 'hood',
      mods: [{ stat: 'dodge', value: 5 }],
    },
    {
      id: tid(),
      name: 'Водоворот',
      category: 'water',
      icon: 'crystal-ball',
      mods: [
        { stat: 'initiative', value: 3 },
        { stat: 'defense', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Текучесть',
      category: 'water',
      icon: 'boot-stomp',
      mods: [
        { stat: 'dodge', value: 3 },
        { stat: 'damage', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Отлив',
      category: 'water',
      icon: 'ghost',
      mods: [
        { stat: 'dodge', value: 1 },
        { stat: 'initiative', value: 1 },
        { stat: 'persuasion', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Штормовая реакция',
      category: 'water',
      icon: 'arrow-cluster',
      mods: [{ stat: 'initiative', value: 5 }],
    },

    // ── air (Воздух) — магия, убеждение ──────────────────────────────────
    {
      id: tid(),
      name: 'Ветер мудрости',
      category: 'air',
      icon: 'magic-swirl',
      mods: [{ stat: 'magic_power', value: 3 }],
    },
    {
      id: tid(),
      name: 'Небесный голос',
      category: 'air',
      icon: 'scroll-quill',
      mods: [{ stat: 'persuasion', value: 3 }],
    },
    {
      id: tid(),
      name: 'Буря разума',
      category: 'air',
      icon: 'star-prominences',
      mods: [
        { stat: 'magic_power', value: 3 },
        { stat: 'persuasion', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Эфирная сила',
      category: 'air',
      icon: 'crystal-ball',
      mods: [{ stat: 'magic_power', value: 5 }],
    },
    {
      id: tid(),
      name: 'Шёпот ветра',
      category: 'air',
      icon: 'scroll-quill',
      mods: [
        { stat: 'persuasion', value: 4 },
        { stat: 'initiative', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Воздушный щит',
      category: 'air',
      icon: 'magic-swirl',
      mods: [
        { stat: 'magic_power', value: 2 },
        { stat: 'resistance', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Грозовой разряд',
      category: 'air',
      icon: 'lightning-arc',
      mods: [
        { stat: 'magic_power', value: 4 },
        { stat: 'damage', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Вихрь красноречия',
      category: 'air',
      icon: 'crown',
      mods: [{ stat: 'persuasion', value: 5 }],
    },
    {
      id: tid(),
      name: 'Попутный ветер',
      category: 'air',
      icon: 'hood',
      mods: [
        { stat: 'initiative', value: 2 },
        { stat: 'magic_power', value: 2 },
      ],
    },
    {
      id: tid(),
      name: 'Чистый эфир',
      category: 'air',
      icon: 'star-prominences',
      mods: [
        { stat: 'magic_power', value: 2 },
        { stat: 'persuasion', value: 1 },
        { stat: 'resistance', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Небесная длань',
      category: 'air',
      icon: 'magic-swirl',
      mods: [
        { stat: 'magic_power', value: 3 },
        { stat: 'hit_chance', value: 1 },
      ],
    },
    {
      id: tid(),
      name: 'Гром небесный',
      category: 'air',
      icon: 'lightning-arc',
      mods: [
        { stat: 'magic_power', value: 2 },
        { stat: 'damage', value: 2 },
      ],
    },
  ]

  const rarityTiers = [
    {
      key: 'white',
      label: 'Белый',
      color: '#ffffff',
      healHp: 10,
      mana: 10,
      poisonDamage: 1,
      turns: 1,
      elemResist: 10,
      elemDamage: 10,
      stamina: { mode: 'flat', value: 1 },
    },
    {
      key: 'blue',
      label: 'Синий',
      color: '#4fc3f7',
      healHp: 20,
      mana: 20,
      poisonDamage: 2,
      turns: 2,
      elemResist: 20,
      elemDamage: 15,
      stamina: { mode: 'flat', value: 2 },
    },
    {
      key: 'gold',
      label: 'Золотой',
      color: '#ffd700',
      healHp: 40,
      mana: 40,
      poisonDamage: 3,
      turns: 3,
      elemResist: 30,
      elemDamage: 25,
      stamina: { mode: 'full' },
    },
    {
      key: 'relic',
      label: 'Бордовый',
      color: '#7d001a',
      healHp: 80,
      mana: 80,
      poisonDamage: 6,
      turns: 6,
      elemResist: 60,
      elemDamage: 35,
      stamina: { mode: 'current_plus', value: 2 },
    },
  ]

  const weaponAndGearBases = [
    {
      slot: 'ranged',
      category: 'ranged',
      icon: 'bow-arrow',
      names: ['Лук странника', 'Длинный лук дозорного', 'Лук ветров'],
    },
    {
      slot: 'two_handed',
      category: 'melee',
      icon: 'pointy-sword',
      names: ['Двуручный меч бастиона', 'Клеймор рассвета', 'Меч великаноборца'],
    },
    {
      slot: 'two_handed',
      category: 'melee',
      icon: 'battle-axe',
      names: ['Секира берсерка', 'Топор штормового клана', 'Рубило северян'],
    },
    {
      slot: 'two_handed',
      category: 'melee',
      icon: 'warhammer',
      names: ['Молот осадника', 'Кувалда рунника', 'Молот грома'],
    },
    {
      slot: 'weapon',
      category: 'melee',
      icon: 'broadsword',
      names: ['Клинок дозора', 'Стальной резак', 'Сабля форпоста'],
    },
    {
      slot: 'weapon',
      category: 'melee',
      icon: 'stiletto',
      names: ['Кинжал ночи', 'Жало лазутчика', 'Нож дуэлянта'],
    },
    {
      slot: 'magic_weapon',
      category: 'magic',
      icon: 'magic-swirl',
      names: ['Жезл эфира', 'Посох чаротворца', 'Фокус архимага'],
    },
    {
      slot: 'magic_weapon',
      category: 'magic',
      icon: 'ice-bolt',
      names: ['Посох льда', 'Хладный жезл', 'Скипетр зимы'],
    },
    {
      slot: 'armor',
      category: 'other',
      icon: 'chest-armor',
      names: ['Кираса легиона', 'Нагрудник стража', 'Доспех бастиона'],
    },
    {
      slot: 'helmet',
      category: 'other',
      icon: 'helmet',
      names: ['Шлем дозорного', 'Шлем карателя', 'Шлем защитника'],
    },
    {
      slot: 'offhand',
      category: 'other',
      icon: 'shield',
      names: ['Щит караула', 'Щит оплота', 'Щит хранителя'],
    },
    {
      slot: 'gloves',
      category: 'other',
      icon: 'gauntlet',
      names: ['Перчатки бойца', 'Латные рукавицы', 'Боевые краги'],
    },
    {
      slot: 'boots',
      category: 'other',
      icon: 'boot-stomp',
      names: ['Сапоги шага', 'Сапоги бегуна', 'Сапоги следопыта'],
    },
    {
      slot: 'legs',
      category: 'other',
      icon: 'trousers',
      names: ['Штаны стража', 'Штаны рейнджера', 'Штаны выжившего'],
    },
    {
      slot: 'cloak',
      category: 'other',
      icon: 'hood',
      names: ['Плащ теней', 'Плащ дозора', 'Плащ путника'],
    },
    {
      slot: 'amulet',
      category: 'magic',
      icon: 'all-seeing-eye',
      names: ['Амулет взора', 'Оберег прорицателя', 'Медальон предчувствия'],
    },
  ]

  const potionBases = [
    {
      slot: 'potion',
      category: 'potion',
      icon: 'health-potion',
      names: ['Зелье исцеления', 'Эликсир жизни', 'Настой регенерации'],
      effectBuilder: (tier) => ({
        kind: 'healing',
        restoreHp: tier.healHp,
      }),
    },
    {
      slot: 'potion',
      category: 'potion',
      icon: 'crystal-ball',
      names: ['Зелье маны', 'Эликсир концентрации', 'Настой ясности'],
      effectBuilder: (tier) => ({
        kind: 'mana',
        restoreMana: tier.mana,
      }),
    },
    {
      slot: 'potion',
      category: 'potion',
      icon: 'poison',
      names: ['Склянка яда', 'Токсичный настой', 'Ядовитый экстракт'],
      effectBuilder: (tier) => ({
        kind: 'poison_weapon_buff',
        poisonDamagePerTurn: tier.poisonDamage,
        turns: tier.turns,
      }),
    },
    {
      slot: 'potion',
      category: 'potion',
      icon: 'fire',
      names: ['Огненное зелье', 'Эликсир пламени', 'Настой саламандры'],
      effectBuilder: (tier) => ({
        kind: 'elemental_buff',
        element: 'fire',
        resistance: tier.elemResist,
        bonusDamage: tier.elemDamage,
        turns: tier.turns,
      }),
    },
    {
      slot: 'potion',
      category: 'potion',
      icon: 'ice-bolt',
      names: ['Водяное зелье', 'Эликсир прилива', 'Настой глубин'],
      effectBuilder: (tier) => ({
        kind: 'elemental_buff',
        element: 'water',
        resistance: tier.elemResist,
        bonusDamage: tier.elemDamage,
        turns: tier.turns,
      }),
    },
    {
      slot: 'potion',
      category: 'potion',
      icon: 'lightning-arc',
      names: ['Воздушное зелье', 'Эликсир бури', 'Настой ветра'],
      effectBuilder: (tier) => ({
        kind: 'elemental_buff',
        element: 'air',
        resistance: tier.elemResist,
        bonusDamage: tier.elemDamage,
        turns: tier.turns,
      }),
    },
    {
      slot: 'potion',
      category: 'potion',
      icon: 'rune-stone',
      names: ['Каменное зелье', 'Эликсир земли', 'Настой титана'],
      effectBuilder: (tier) => ({
        kind: 'elemental_buff',
        element: 'earth',
        resistance: tier.elemResist,
        bonusDamage: tier.elemDamage,
        turns: tier.turns,
      }),
    },
    {
      slot: 'potion',
      category: 'potion',
      icon: 'brandy-bottle',
      names: ['Зелье выносливости', 'Эликсир марш-броска', 'Настой бодрости'],
      effectBuilder: (tier) => ({
        kind: 'stamina',
        actionPoints: tier.stamina,
      }),
    },
  ]

  function buildGenericItem(base, nameIdx) {
    return {
      id: iid(),
      name: base.names[nameIdx % base.names.length],
      icon: base.icon,
      slot: base.slot,
      category: base.category,
    }
  }

  function buildPotionItem(base, tierIndex) {
    const tier = rarityTiers[tierIndex]
    const nameVariant = base.names[tierIndex % 3]
    return {
      id: iid(),
      name: nameVariant,
      icon: base.icon,
      slot: base.slot,
      category: base.category,
      rarity: tier.key,
      rarityLabel: tier.label,
      rarityColor: tier.color,
      traitIds: [],
      effects: [base.effectBuilder(tier)],
    }
  }

  const items = []

  for (const base of weaponAndGearBases) {
    for (let nameIdx = 0; nameIdx < base.names.length; nameIdx++) {
      items.push(buildGenericItem(base, nameIdx))
    }
  }

  for (const base of potionBases) {
    for (let tierIndex = 0; tierIndex < rarityTiers.length; tierIndex++) {
      items.push(buildPotionItem(base, tierIndex))
    }
  }

  // 16 (снаряжение) * 3 имени + 8 (зелья) * 4 тира = 48 + 32 = 80
  if (items.length !== 80) {
    throw new Error(`Seed items count mismatch: expected 80, got ${items.length}`)
  }

  localStorage.setItem('game-dnd:traits', JSON.stringify(traits))
  localStorage.setItem('game-dnd:items', JSON.stringify(items))
  localStorage.setItem('game-dnd:seed-version', SEED_VERSION)

  console.log(
    `✅ Seed v8 готов: ${traits.length} свойств, ${items.length} предметов (стихии: огонь/земля/вода/воздух)`
  )
  console.log('Перезагрузи страницу чтобы Pinia подхватила новые данные.')
  return items
}

export function seedIfNeeded() {
  if (localStorage.getItem('game-dnd:seed-version') !== SEED_VERSION) {
    seedDemoData()
  }
}

const SEED_VERSION = '7'

export function seedDemoData() {
  const now = Date.now()
  let counter = 1
  const tid = () => `trait_seed_${now}_${counter++}`
  const iid = () => `item_seed_${now}_${counter++}`

  const traits = [
    // ── passive ──────────────────────────────────────────────────────────────
    {
      id: tid(),
      name: 'Железная кожа',
      category: 'passive',
      icon: 'shield',
      mods: [
        { stat: 'defense', value: 3 },
        { stat: 'initiative', value: -1 },
      ],
    },
    {
      id: tid(),
      name: 'Боевая выучка',
      category: 'passive',
      icon: 'broadsword',
      mods: [
        { stat: 'hit_chance', value: 2 },
        { stat: 'dodge', value: -1 },
      ],
    },
    {
      id: tid(),
      name: 'Убийственный инстинкт',
      category: 'passive',
      icon: 'stiletto',
      mods: [
        { stat: 'damage', value: 3 },
        { stat: 'defense', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Мистическое чутьё',
      category: 'passive',
      icon: 'magic-swirl',
      mods: [
        { stat: 'magic_power', value: 3 },
        { stat: 'hit_chance', value: -1 },
      ],
    },
    {
      id: tid(),
      name: 'Чародейский доспех',
      category: 'passive',
      icon: 'crystal-ball',
      mods: [
        { stat: 'resistance', value: 3 },
        { stat: 'damage', value: -1 },
      ],
    },
    {
      id: tid(),
      name: 'Кошачья ловкость',
      category: 'passive',
      icon: 'boot-stomp',
      mods: [
        { stat: 'dodge', value: 4 },
        { stat: 'defense', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Острый язык',
      category: 'passive',
      icon: 'scroll-quill',
      mods: [
        { stat: 'persuasion', value: 3 },
        { stat: 'damage', value: -1 },
      ],
    },
    {
      id: tid(),
      name: 'Молниеносная реакция',
      category: 'passive',
      icon: 'arrow-cluster',
      mods: [
        { stat: 'initiative', value: 4 },
        { stat: 'defense', value: -2 },
        { stat: 'resistance', value: -1 },
      ],
    },
    {
      id: tid(),
      name: 'Тяжёлая броня',
      category: 'passive',
      icon: 'chest-armor',
      mods: [
        { stat: 'defense', value: 5 },
        { stat: 'resistance', value: 2 },
        { stat: 'initiative', value: -3 },
        { stat: 'dodge', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Берсерк',
      category: 'passive',
      icon: 'battle-axe',
      mods: [
        { stat: 'damage', value: 5 },
        { stat: 'hit_chance', value: 2 },
        { stat: 'defense', value: -3 },
        { stat: 'dodge', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Скрытность',
      category: 'passive',
      icon: 'ghost',
      mods: [
        { stat: 'dodge', value: 3 },
        { stat: 'initiative', value: 2 },
        { stat: 'damage', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Магическое превосходство',
      category: 'passive',
      icon: 'star-prominences',
      mods: [
        { stat: 'magic_power', value: 5 },
        { stat: 'resistance', value: 2 },
        { stat: 'defense', value: -3 },
        { stat: 'hit_chance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Дипломат',
      category: 'passive',
      icon: 'crown',
      mods: [
        { stat: 'persuasion', value: 4 },
        { stat: 'damage', value: -2 },
        { stat: 'hit_chance', value: -1 },
      ],
    },
    {
      id: tid(),
      name: 'Стойкость духа',
      category: 'passive',
      icon: 'rune-stone',
      mods: [
        { stat: 'resistance', value: 4 },
        { stat: 'defense', value: 2 },
        { stat: 'initiative', value: -2 },
        { stat: 'dodge', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Неуловимый',
      category: 'passive',
      icon: 'stiletto',
      mods: [
        { stat: 'dodge', value: 5 },
        { stat: 'initiative', value: 3 },
        { stat: 'damage', value: -3 },
        { stat: 'defense', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Убеждающий взгляд',
      category: 'passive',
      icon: 'all-seeing-eye',
      mods: [
        { stat: 'persuasion', value: 3 },
        { stat: 'hit_chance', value: 1 },
        { stat: 'dodge', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Доспех зачарователя',
      category: 'passive',
      icon: 'magic-swirl',
      mods: [
        { stat: 'magic_power', value: 3 },
        { stat: 'resistance', value: 3 },
        { stat: 'damage', value: -2 },
        { stat: 'hit_chance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Ветеран боёв',
      category: 'passive',
      icon: 'chest-armor',
      mods: [
        { stat: 'hit_chance', value: 3 },
        { stat: 'damage', value: 2 },
        { stat: 'dodge', value: -2 },
        { stat: 'persuasion', value: -1 },
      ],
    },

    // ── active ───────────────────────────────────────────────────────────────
    {
      id: tid(),
      name: 'Боевой клич',
      category: 'active',
      icon: 'swords-power',
      mods: [
        { stat: 'damage', value: 4 },
        { stat: 'hit_chance', value: 2 },
        { stat: 'defense', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Магический залп',
      category: 'active',
      icon: 'fire',
      mods: [
        { stat: 'magic_power', value: 5 },
        { stat: 'resistance', value: -2 },
        { stat: 'defense', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Уклонение',
      category: 'active',
      icon: 'boot-stomp',
      mods: [
        { stat: 'dodge', value: 5 },
        { stat: 'initiative', value: 2 },
        { stat: 'damage', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Щит разума',
      category: 'active',
      icon: 'shield',
      mods: [
        { stat: 'resistance', value: 5 },
        { stat: 'defense', value: 3 },
        { stat: 'initiative', value: -3 },
        { stat: 'dodge', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Смертельный удар',
      category: 'active',
      icon: 'broadsword',
      mods: [
        { stat: 'damage', value: 6 },
        { stat: 'hit_chance', value: -2 },
        { stat: 'dodge', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Переговоры',
      category: 'active',
      icon: 'scroll-quill',
      mods: [
        { stat: 'persuasion', value: 5 },
        { stat: 'initiative', value: -2 },
        { stat: 'damage', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Ледяная стрела',
      category: 'active',
      icon: 'ice-bolt',
      mods: [
        { stat: 'magic_power', value: 4 },
        { stat: 'hit_chance', value: 2 },
        { stat: 'defense', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Засада',
      category: 'active',
      icon: 'arrow-cluster',
      mods: [
        { stat: 'damage', value: 4 },
        { stat: 'initiative', value: 3 },
        { stat: 'defense', value: -3 },
        { stat: 'resistance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Стремительная атака',
      category: 'active',
      icon: 'stiletto',
      mods: [
        { stat: 'hit_chance', value: 4 },
        { stat: 'initiative', value: 3 },
        { stat: 'defense', value: -3 },
        { stat: 'resistance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Прорыв защиты',
      category: 'active',
      icon: 'warhammer',
      mods: [
        { stat: 'damage', value: 5 },
        { stat: 'dodge', value: -3 },
        { stat: 'defense', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Навязать волю',
      category: 'active',
      icon: 'bear-head',
      mods: [
        { stat: 'persuasion', value: 4 },
        { stat: 'magic_power', value: 2 },
        { stat: 'damage', value: -2 },
        { stat: 'hit_chance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Призрачный шаг',
      category: 'active',
      icon: 'ghost',
      mods: [
        { stat: 'dodge', value: 4 },
        { stat: 'initiative', value: 4 },
        { stat: 'damage', value: -2 },
        { stat: 'defense', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Огненный шар',
      category: 'active',
      icon: 'fire',
      mods: [
        { stat: 'magic_power', value: 6 },
        { stat: 'resistance', value: -3 },
        { stat: 'defense', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Тотем волка',
      category: 'active',
      icon: 'wolf-head',
      mods: [
        { stat: 'damage', value: 3 },
        { stat: 'hit_chance', value: 3 },
        { stat: 'persuasion', value: -3 },
      ],
    },

    // ── status ───────────────────────────────────────────────────────────────
    {
      id: tid(),
      name: 'Отравление',
      category: 'status',
      icon: 'poison',
      mods: [
        { stat: 'hit_chance', value: -3 },
        { stat: 'initiative', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Страх',
      category: 'status',
      icon: 'ghost',
      mods: [
        { stat: 'damage', value: -3 },
        { stat: 'hit_chance', value: -2 },
        { stat: 'persuasion', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Замедление',
      category: 'status',
      icon: 'ice-bolt',
      mods: [
        { stat: 'initiative', value: -4 },
        { stat: 'dodge', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Ослабление',
      category: 'status',
      icon: 'death-skull',
      mods: [
        { stat: 'damage', value: -4 },
        { stat: 'hit_chance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Проклятие',
      category: 'status',
      icon: 'cursed-star',
      mods: [
        { stat: 'resistance', value: -4 },
        { stat: 'magic_power', value: -3 },
        { stat: 'persuasion', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Оглушение',
      category: 'status',
      icon: 'warhammer',
      mods: [
        { stat: 'initiative', value: -5 },
        { stat: 'dodge', value: -3 },
        { stat: 'hit_chance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Ярость безумца',
      category: 'status',
      icon: 'battle-axe',
      mods: [
        { stat: 'damage', value: 4 },
        { stat: 'hit_chance', value: -3 },
        { stat: 'defense', value: -3 },
        { stat: 'dodge', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Паралич',
      category: 'status',
      icon: 'dinosaur-bones',
      mods: [
        { stat: 'initiative', value: -6 },
        { stat: 'dodge', value: -4 },
        { stat: 'defense', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Мистическое слияние',
      category: 'status',
      icon: 'magic-swirl',
      mods: [
        { stat: 'magic_power', value: 4 },
        { stat: 'resistance', value: 3 },
        { stat: 'damage', value: -4 },
        { stat: 'hit_chance', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Слепота',
      category: 'status',
      icon: 'all-seeing-eye',
      mods: [
        { stat: 'hit_chance', value: -5 },
        { stat: 'dodge', value: -3 },
      ],
    },

    // ── racial ───────────────────────────────────────────────────────────────
    {
      id: tid(),
      name: 'Гномья крепость',
      category: 'racial',
      icon: 'shield',
      mods: [
        { stat: 'defense', value: 3 },
        { stat: 'resistance', value: 2 },
        { stat: 'initiative', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Эльфийские чувства',
      category: 'racial',
      icon: 'arrow-cluster',
      mods: [
        { stat: 'hit_chance', value: 3 },
        { stat: 'initiative', value: 2 },
        { stat: 'defense', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Орочья ярость',
      category: 'racial',
      icon: 'hatchet',
      mods: [
        { stat: 'damage', value: 4 },
        { stat: 'hit_chance', value: 2 },
        { stat: 'persuasion', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Хоббитская удача',
      category: 'racial',
      icon: 'heart-organ',
      mods: [
        { stat: 'dodge', value: 3 },
        { stat: 'persuasion', value: 2 },
        { stat: 'damage', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Драконья кровь',
      category: 'racial',
      icon: 'fire',
      mods: [
        { stat: 'magic_power', value: 3 },
        { stat: 'resistance', value: 3 },
        { stat: 'dodge', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Тёмный эльф',
      category: 'racial',
      icon: 'death-skull',
      mods: [
        { stat: 'damage', value: 3 },
        { stat: 'initiative', value: 3 },
        { stat: 'persuasion', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Полурослик',
      category: 'racial',
      icon: 'star-prominences',
      mods: [
        { stat: 'dodge', value: 3 },
        { stat: 'persuasion', value: 2 },
        { stat: 'damage', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Каменный тролль',
      category: 'racial',
      icon: 'dinosaur-bones',
      mods: [
        { stat: 'defense', value: 5 },
        { stat: 'resistance', value: 3 },
        { stat: 'initiative', value: -4 },
        { stat: 'dodge', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Лесной дух',
      category: 'racial',
      icon: 'rune-stone',
      mods: [
        { stat: 'magic_power', value: 2 },
        { stat: 'resistance', value: 2 },
        { stat: 'hit_chance', value: 1 },
        { stat: 'damage', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Морской народ',
      category: 'racial',
      icon: 'crystal-ball',
      mods: [
        { stat: 'initiative', value: 2 },
        { stat: 'dodge', value: 2 },
        { stat: 'defense', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Оборотень',
      category: 'racial',
      icon: 'wolf-head',
      mods: [
        { stat: 'damage', value: 4 },
        { stat: 'initiative', value: 3 },
        { stat: 'persuasion', value: -4 },
      ],
    },
    {
      id: tid(),
      name: 'Демоническая кровь',
      category: 'racial',
      icon: 'cursed-star',
      mods: [
        { stat: 'magic_power', value: 3 },
        { stat: 'damage', value: 2 },
        { stat: 'persuasion', value: -3 },
        { stat: 'resistance', value: -1 },
      ],
    },
    {
      id: tid(),
      name: 'Ангельское происхождение',
      category: 'racial',
      icon: 'star-prominences',
      mods: [
        { stat: 'resistance', value: 3 },
        { stat: 'persuasion', value: 3 },
        { stat: 'damage', value: -3 },
      ],
    },

    // ── class ────────────────────────────────────────────────────────────────
    {
      id: tid(),
      name: 'Воинская дисциплина',
      category: 'class',
      icon: 'chest-armor',
      mods: [
        { stat: 'hit_chance', value: 3 },
        { stat: 'defense', value: 2 },
        { stat: 'dodge', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Воровское мастерство',
      category: 'class',
      icon: 'stiletto',
      mods: [
        { stat: 'dodge', value: 4 },
        { stat: 'initiative', value: 3 },
        { stat: 'defense', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Магическое обучение',
      category: 'class',
      icon: 'magic-swirl',
      mods: [
        { stat: 'magic_power', value: 4 },
        { stat: 'resistance', value: 2 },
        { stat: 'damage', value: -2 },
        { stat: 'hit_chance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Клерикальная мудрость',
      category: 'class',
      icon: 'scroll-quill',
      mods: [
        { stat: 'resistance', value: 4 },
        { stat: 'persuasion', value: 3 },
        { stat: 'damage', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Рейнджерская выучка',
      category: 'class',
      icon: 'arrow-cluster',
      mods: [
        { stat: 'hit_chance', value: 4 },
        { stat: 'initiative', value: 2 },
        { stat: 'defense', value: -2 },
        { stat: 'resistance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Паладинское благословение',
      category: 'class',
      icon: 'shield',
      mods: [
        { stat: 'defense', value: 3 },
        { stat: 'resistance', value: 3 },
        { stat: 'persuasion', value: 1 },
        { stat: 'dodge', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Некромантский ритуал',
      category: 'class',
      icon: 'death-skull',
      mods: [
        { stat: 'magic_power', value: 5 },
        { stat: 'damage', value: 2 },
        { stat: 'persuasion', value: -4 },
      ],
    },
    {
      id: tid(),
      name: 'Варварская сила',
      category: 'class',
      icon: 'battle-axe',
      mods: [
        { stat: 'damage', value: 5 },
        { stat: 'hit_chance', value: 2 },
        { stat: 'defense', value: -3 },
        { stat: 'dodge', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Бардовское обаяние',
      category: 'class',
      icon: 'scroll-quill',
      mods: [
        { stat: 'persuasion', value: 5 },
        { stat: 'initiative', value: 2 },
        { stat: 'damage', value: -3 },
      ],
    },
    {
      id: tid(),
      name: 'Монашеская техника',
      category: 'class',
      icon: 'boot-stomp',
      mods: [
        { stat: 'dodge', value: 3 },
        { stat: 'hit_chance', value: 3 },
        { stat: 'defense', value: -2 },
        { stat: 'resistance', value: -2 },
      ],
    },
    {
      id: tid(),
      name: 'Шаманский зов',
      category: 'class',
      icon: 'rune-stone',
      mods: [
        { stat: 'magic_power', value: 3 },
        { stat: 'resistance', value: 2 },
        { stat: 'hit_chance', value: -2 },
        { stat: 'damage', value: -1 },
      ],
    },
    {
      id: tid(),
      name: 'Боевой маг',
      category: 'class',
      icon: 'swords-power',
      mods: [
        { stat: 'magic_power', value: 3 },
        { stat: 'damage', value: 3 },
        { stat: 'defense', value: -2 },
        { stat: 'dodge', value: -2 },
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
      icon: 'greatsword',
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
      names: ['Ледяное зелье', 'Эликсир инея', 'Настой зимы'],
      effectBuilder: (tier) => ({
        kind: 'elemental_buff',
        element: 'ice',
        resistance: tier.elemResist,
        bonusDamage: tier.elemDamage,
        turns: tier.turns,
      }),
    },
    {
      slot: 'potion',
      category: 'potion',
      icon: 'lightning-arc',
      names: ['Грозовое зелье', 'Эликсир молнии', 'Настой разряда'],
      effectBuilder: (tier) => ({
        kind: 'elemental_buff',
        element: 'lightning',
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
      icon: 'magic-swirl',
      names: ['Арканное зелье', 'Эликсир эфира', 'Настой потока'],
      effectBuilder: (tier) => ({
        kind: 'elemental_buff',
        element: 'arcane',
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

  // 16 (снаряжение) * 3 имени + 9 (зелья) * 4 тира = 48 + 36 = 84
  if (items.length !== 84) {
    throw new Error(`Seed items count mismatch: expected 84, got ${items.length}`)
  }

  localStorage.setItem('game-dnd:traits', JSON.stringify(traits))
  localStorage.setItem('game-dnd:items', JSON.stringify(items))
  localStorage.setItem('game-dnd:seed-version', SEED_VERSION)

  console.log(
    `✅ Seed v7 готов: ${traits.length} свойств, ${items.length} предметов (gear — шаблоны без редкости, зелья — с эффектами)`
  )
  console.log('Перезагрузи страницу чтобы Pinia подхватила новые данные.')
  return items
}

export function seedIfNeeded() {
  if (localStorage.getItem('game-dnd:seed-version') !== SEED_VERSION) {
    seedDemoData()
  }
}

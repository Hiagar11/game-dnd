import mongoose from 'mongoose'

// =============================================================================
// СИСТЕМА ХАРАКТЕРИСТИК ТОКЕНА (ДИЗАЙН-ДОКУМЕНТ)
// =============================================================================
//
// ─── ПЕРВИЧНЫЕ ХАРАКТЕРИСТИКИ (4) ─────────────────────────────────────────────
// Прокачиваются вручную через очки характеристик (левел-ап).
//
//   strength  — Сила     : физическая мощь, тяжёлое оружие, выносливость
//   agility   — Ловкость : скорость, точность движений, реакция
//   intellect — Интеллект: тактическое мышление, знание магии, концентрация
//   charisma  — Харизма  : воля, командный дух, удача, устойчивость психики
//
// ─── ВТОРИЧНЫЕ ХАРАКТЕРИСТИКИ (9) ─────────────────────────────────────────────
// НЕ прокачиваются напрямую. Пересчитываются автоматически при изменении первичных.
// Формулы используют Math.floor для целых чисел.
//
//  #  |  Поле         | Название рус.     | Формула                              | Зависит от
// ────┼───────────────┼───────────────────┼──────────────────────────────────────┼──────────────────
//  1  | damage        | Урон              | floor((strength*2 + agility) / 5)    | Сила ×2, Ловк ×1
//  2  | critChance    | Шанс нанести урон | floor((agility*2 + strength) / 5)    | Ловк ×2, Сила ×1
//  3  | defense       | Защита            | floor((strength + agility) / 4)      | Сила, Ловкость
//  4  | evasion       | Уклонение         | floor((agility*3 + strength) / 5)    | Ловк ×3, Сила ×1
//  5  | initiative    | Инициатива        | floor((agility + intellect) / 2)     | Ловкость, Интел.
//  6  | resistance    | Сопротивление     | floor((intellect + strength) / 3)    | Интеллект, Сила
//  7  | magicPower    | Магическая сила   | floor(intellect * 2 / 3)             | Интеллект ×2
//  8  | persuasion    | Убеждение         | floor((charisma*2 + intellect) / 3)  | Хариз. ×2, Интел.
//
// ─── ПРОВЕРКА ПРИМЕРА ─────────────────────────────────────────────────────────
// Сила=2, Ловкость=2, Интеллект=0, Харизма=0 (всё остальное 0 по умолчанию):
//   critChance   = floor((4+2)/5)       = floor(1.20) = 1  ✓
//   defense      = floor((2+2)/4)       = floor(1.00) = 1  ✓
//   evasion      = floor((6+2)/5)       = floor(1.60) = 1  ✓
//   initiative   = floor((2+0)/2)       = floor(1.00) = 1  ✓
//
// ─── ПОКРЫТИЕ КОМБИНАЦИЙ ──────────────────────────────────────────────────────
//   Сила                → damage, critChance, defense, evasion, resistance
//   Ловкость            → damage, critChance, defense, evasion, initiative
//   Интеллект           → initiative, resistance, magicPower, persuasion
//   Харизма             → persuasion
//   Сила + Ловкость     → critChance (прямая), defense (прямая)
//   Сила + Интеллект    → resistance
//   Ловкость + Интеллект→ initiative
//   Интеллект + Харизма → persuasion
// =============================================================================

// Характеристики токена — только первичные (прокачиваемые).
// Вторичные (damage, critChance, defense и т.д.) вычисляются на клиенте по формулам из комментария выше.
const statsSchema = new mongoose.Schema(
  {
    strength: { type: Number, default: 0 },
    agility: { type: Number, default: 0 },
    intellect: { type: Number, default: 0 },
    charisma: { type: Number, default: 0 },
  },
  { _id: false }
)

// Схема типа токена (шаблон — не экземпляр на карте).
// Экземпляры на карте хранятся в Scenario.placedTokens.
const tokenSchema = new mongoose.Schema(
  {
    // Владелец токена — DM, создавший его
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    // Путь к файлу изображения на сервере (относительный от uploads/)
    imagePath: {
      type: String,
      required: true,
    },
    stats: {
      type: statsSchema,
      default: () => ({}),
    },
    // npc — обычные персонажи, hero — герои игроков (видны в меню зрителя)
    tokenType: {
      type: String,
      enum: ['npc', 'hero'],
      default: 'npc',
    },
    // Отношение НПС к героям — влияет на цвет рамки токена на карте.
    // Применимо только к tokenType === 'npc'.
    attitude: {
      type: String,
      enum: ['neutral', 'friendly', 'hostile'],
      default: 'neutral',
    },
    // Описание личности НПС для языковой модели.
    // Системный промпт: как персонаж говорит, кто он, что знает.
    // Пример: "Ты — старый кузнец Борин. Грубый, но честный. Говоришь коротко."
    personality: {
      type: String,
      default: '',
      maxlength: 500,
    },
    // Личное имя НПС для ИИ-диалога (отличается от name — класса токена).
    // Например: name="Гоблин-разведчик", npcName="Скрипач"
    npcName: {
      type: String,
      default: '',
      maxlength: 40,
    },
    // Контекстные заметки ДМ о прошлом НПС — включаются в ИИ-промпт как «память персонажа».
    // Пример: «Помнит, что игрок Аравин помог ему в прошлый раз. Относится к нему с симпатией.»
    // Заполняется ДМ вручную или при сохранении сессии через ИИ-суммаризацию.
    contextNotes: {
      type: String,
      default: '',
      maxlength: 800,
    },
    // Секретные знания НПС — факты, которые можно получить через успешную проверку убеждения.
    // ИИ использует это поле для определения, когда требовать persuasion check.
    // Пример: «Знает, что в подвале таверны спрятан артефакт. Видел некроманта у кладбища.»
    secretKnowledge: {
      type: String,
      default: '',
      maxlength: 500,
    },
    // Тип нрава НПС — влияет на пороги смены отношений и скорость сближения.
    // 'friendly' — дружелюбный: порог +20/-80, +очки ×2
    // 'sociable' — общительный: порог +35/-65, +очки ×1.5
    // 'neutral'  — нейтральный: порог +50/-50, +очки ×1 (по умолчанию)
    // 'guarded'  — осторожный: порог +60/-40, +очки ×0.75
    // 'hostile'  — враждебный: порог +70/-30, +очки ×0.5
    dispositionType: {
      type: String,
      enum: ['friendly', 'sociable', 'neutral', 'guarded', 'hostile'],
      default: 'neutral',
    },
    // Опыт и уровень — только для героев (tokenType === 'hero').
    // Хранятся на шаблоне токена: перс. прокачка сохраняется между сессиями.
    // Уровень автоматически пересчитывается при начислении XP через PATCH /api/tokens/:id/xp.
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
)

tokenSchema.index({ owner: 1 })

export default mongoose.model('Token', tokenSchema)

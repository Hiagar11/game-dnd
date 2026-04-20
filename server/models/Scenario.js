import mongoose from 'mongoose'

// Экземпляр токена на карте — ссылка на шаблон + позиция + флаги видимости.
const placedTokenSchema = new mongoose.Schema(
  {
    // uid — уникальный идентификатор экземпляра (один шаблон можно поставить несколько раз)
    uid: { type: String, required: true },
    // Ссылка на шаблон токена. null — для системных токенов (дверь, ловушка и т.д.)
    tokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token',
      default: null,
    },
    // Идентификатор системного токена (например 'door'). null — для обычных токенов.
    systemToken: { type: String, default: null },
    // Для дверей: id целевого сценария для перехода. null — связь не настроена.
    targetScenarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scenario',
      default: null,
    },
    // true — дверь ведёт на глобальную карту (вместо targetScenarioId)
    globalMapExit: { type: Boolean, default: false },
    col: { type: Number, required: true },
    row: { type: Number, required: true },
    // hidden: true — токен виден только DM (используется для врагов в тумане войны)
    hidden: { type: Boolean, default: false },
    // ─── Переопределяемые поля ─────────────────────────────────────────────
    // Если null — при загрузке используется значение из шаблона (Token).
    // Устанавливаются через сокет token:edit при редактировании размещённого токена.
    tokenType: { type: String, default: null }, // 'hero' | 'npc', кешируется для надёжной загрузки
    name: { type: String, default: null }, // переименование экземпляра
    attitude: { type: String, default: null }, // изменилось в ходе сессии
    hp: { type: Number, default: null },
    maxHp: { type: Number, default: null },
    npcName: { type: String, default: null },
    personality: { type: String, default: null },
    contextNotes: { type: String, default: null },
    dispositionType: { type: String, default: null },
    strength: { type: Number, default: null },
    agility: { type: Number, default: null },
    intellect: { type: Number, default: null },
    charisma: { type: Number, default: null },
    // Персональный инвентарь экземпляра токена (сумка + экипировка)
    inventory: { type: mongoose.Schema.Types.Mixed, default: null },
    // ─── Новые поля (XP, уровень, статус, автолевел) ────────────────────────
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    statPoints: { type: Number, default: 0 },
    autoLevel: { type: Boolean, default: false },
    race: { type: String, default: '' },
    heroClass: { type: String, default: '' },
    armed: { type: Boolean, default: false },
    secretKnowledge: { type: String, default: null },
    stunned: { type: Boolean, default: false },
    captured: { type: Boolean, default: false },
    combatLog: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // ─── Дерево способностей и активные слоты ───────────────────────────────
    treeActivatedIds: { type: [String], default: [] },
    abilities: { type: [mongoose.Schema.Types.Mixed], default: [] },
    passiveAbilities: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // История диалога с NPC (последние 10 реплик, персистится между сессиями)
    dialogHistory: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    // Накопленные впечатления NPC о игроке (макс. 5)
    behaviorNotes: { type: [String], default: undefined },
    // Текущий счёт отношения NPC (-30..+60)
    attitudeScore: { type: Number, default: undefined },
    // Журнал событий NPC — действия игрока (торговля, бой, подарки и т.д.), макс. 10
    eventLog: { type: [String], default: undefined },
    // ─── Поля контейнеров / визуала ─────────────────────────────────────────
    items: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    opened: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    halfSize: { type: Boolean, default: false },
    quarterSize: { type: Boolean, default: false },
  },
  { _id: false }
)

// Схема сценария — содержит карту, настройки и текущее состояние расстановки.
const scenarioSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    // Путь к изображению карты (относительный от uploads/)
    mapImagePath: {
      type: String,
      default: null,
    },
    // Размер ячейки в пикселях — привязан к конкретной карте
    cellSize: {
      type: Number,
      default: 60,
    },
    // Смещение сетки относительно края карты (наследуется из Map при создании уровня)
    gridOffsetX: {
      type: Number,
      default: 0,
    },
    gridOffsetY: {
      type: Number,
      default: 0,
    },
    // Текущая расстановка токенов (изменяется во время игры)
    placedTokens: {
      type: [placedTokenSchema],
      default: [],
    },
    // Эталонная расстановка токенов — устанавливается редактором, не меняется геймплеем.
    // Используется для сброса к исходному состоянию при запуске новой игры.
    defaultPlacedTokens: {
      type: [placedTokenSchema],
      default: [],
    },
    // Открытые (видимые игрокам) зоны тумана войны.
    // Формат: массив { col, row } — ячейки без тумана.
    // Пустой массив = весь экран в тумане.
    revealedCells: {
      type: [{ col: Number, row: Number, _id: false }],
      default: [],
    },
    // Стены — клетки, помеченные как непроходимые (рисуются красным в редакторе).
    walls: {
      type: [{ col: Number, row: Number, _id: false }],
      default: [],
    },
    // Описание местности — отправляется в системный промпт всем НПС сценария.
    // ДМ описывает атмосферу, место, особенности локации.
    // Пример: «Таверна 'Ржавый якорь'. Тёмное место, воры и контрабандисты. Все настороженные.»
    locationDescription: {
      type: String,
      default: '',
      maxlength: 600,
    },
    // Контекст карты — знания, доступные игроку.
    // НПС читает этот контекст и реагирует на упоминания из него.
    mapContext: {
      type: String,
      default: '',
      maxlength: 1000,
    },
  },
  { timestamps: true }
)

scenarioSchema.index({ owner: 1 })

export default mongoose.model('Scenario', scenarioSchema)

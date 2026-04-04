import mongoose from 'mongoose'

// Экземпляр токена на карте — ссылка на шаблон + позиция + флаги видимости.
const placedTokenSchema = new mongoose.Schema(
  {
    // uid — уникальный идентификатор экземпляра (один шаблон можно поставить несколько раз)
    uid: { type: String, required: true },
    // Ссылка на шаблон токена
    tokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token',
      required: true,
    },
    col: { type: Number, required: true },
    row: { type: Number, required: true },
    // hidden: true — токен виден только DM (используется для врагов в тумане войны)
    hidden: { type: Boolean, default: false },
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
    // Текущая расстановка токенов
    placedTokens: {
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
  },
  { timestamps: true }
)

export default mongoose.model('Scenario', scenarioSchema)

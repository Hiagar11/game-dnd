import mongoose from 'mongoose'

// Характеристики токена — числовые поля с дефолтом 0.
// Вынесены в отдельный sub-schema объект для чистоты.
const statsSchema = new mongoose.Schema(
  {
    meleeDmg: { type: Number, default: 0 },
    rangedDmg: { type: Number, default: 0 },
    visionRange: { type: Number, default: 6 },
    defense: { type: Number, default: 0 },
    evasion: { type: Number, default: 0 },
  },
  { _id: false } // не нужен отдельный _id для вложенного объекта
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
  },
  { timestamps: true }
)

export default mongoose.model('Token', tokenSchema)

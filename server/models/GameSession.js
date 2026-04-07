import mongoose from 'mongoose'

// Сохранённая игровая сессия — фиксирует прогресс (на какой карте остановились).
// Создаётся/обновляется когда мастер выходит из игры и нажимает «Сохранить».
// При следующем запуске мастер видит список своих сохранений и может продолжить.
const gameSessionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Имя, которое мастер дал сессии при сохранении (например «Поход в Замок»)
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    // Кампания (набор карт со связями), в которой шла игра
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    // Денормализованное название кампании — для отображения без populate
    campaignName: { type: String, default: '' },
    // Текущая карта (сценарий в терминах БД) на которой остановились
    currentScenarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scenario',
      required: true,
    },
    // Денормализованное название карты — для отображения без populate
    currentScenarioName: { type: String, default: '' },
    // Снапшот игрового состояния на момент сохранения.
    // Позволяет восстановить позиции токенов и туман войны при продолжении.
    placedTokens: { type: mongoose.Schema.Types.Mixed, default: [] },
    revealedCells: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
)

// У одного пользователя имена сессий уникальны: повторное сохранение с тем же именем
// обновляет существующую запись (upsert), а не создаёт дубликат.
gameSessionSchema.index({ owner: 1, name: 1 }, { unique: true })

export default mongoose.model('GameSession', gameSessionSchema)

import mongoose from 'mongoose'

// Позиция узла в визуальном редакторе сценария (для каждой заполненной карты)
const nodeSchema = new mongoose.Schema(
  {
    scenarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scenario', required: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  { _id: false }
)

// Ребро графа — двунаправленная связь между двумя картами.
// Если ребро ведёт к глобальной карте, from — scenarioId, to — null,
// а stopUid указывает на конкретную остановку.
const edgeSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'Scenario', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'Scenario', default: null },
    // uid остановки на глобальной карте (только для связей «сценарий → глобальная карта»)
    stopUid: { type: String, default: null },
  },
  { _id: false }
)

// Сценарий (кампания) — именованный набор связей между заполненными картами.
// Визуально редактируется в разделе «Создать сценарий» и используется для
// фильтрации переходов через двери во время игры.
const campaignSchema = new mongoose.Schema(
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
    // Позиции карточек в визуальном редакторе (scenarioId → {x, y})
    nodes: { type: [nodeSchema], default: [] },
    // Связи между картами (двунаправленные)
    edges: { type: [edgeSchema], default: [] },
    // Стартовая локация — с неё начинается игра при запуске сценария
    startScenarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scenario',
      default: null,
    },
    // Привязанная глобальная карта (одна на кампанию)
    globalMapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalMap',
      default: null,
    },
    // Позиция карточки глобальной карты на холсте редактора
    globalMapNodeX: { type: Number, default: null },
    globalMapNodeY: { type: Number, default: null },
  },
  { timestamps: true }
)

campaignSchema.index({ owner: 1 })

export default mongoose.model('Campaign', campaignSchema)

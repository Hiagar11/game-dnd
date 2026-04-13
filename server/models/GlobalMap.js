import mongoose from 'mongoose'

// Остановка (точка на глобальной карте), к которой можно привязать локацию (Scenario).
const stopSchema = new mongoose.Schema(
  {
    // Уникальный идентификатор остановки (фронтенд генерирует при создании)
    uid: { type: String, required: true },
    // Координаты центра точки на изображении (пиксели от левого верхнего угла)
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    // Название (отображается на карте)
    label: { type: String, default: '' },
    // Привязанный сценарий (null = не привязан)
    scenarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scenario',
      default: null,
    },
  },
  { _id: false }
)

// Путь между двумя остановками — массив промежуточных точек (линия).
const pathSchema = new mongoose.Schema(
  {
    // uid начальной и конечной остановок
    from: { type: String, required: true },
    to: { type: String, required: true },
    // Промежуточные точки (изгибы маршрута); пустой = прямая линия
    waypoints: [
      {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        _id: false,
      },
    ],
  },
  { _id: false }
)

const globalMapSchema = new mongoose.Schema(
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
    imagePath: {
      type: String,
      required: true,
    },
    stops: [stopSchema],
    paths: [pathSchema],
  },
  { timestamps: true }
)

globalMapSchema.index({ owner: 1 })

export default mongoose.model('GlobalMap', globalMapSchema)

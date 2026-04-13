import mongoose from 'mongoose'

const mapSchema = new mongoose.Schema(
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
    // Относительный путь к файлу изображения карты (uploads/maps/...)
    imagePath: {
      type: String,
      required: true,
    },
    // Размер ячейки в пикселях — задаётся при загрузке, наследуется сценариями
    cellSize: {
      type: Number,
      default: 60,
    },
    // Смещение сетки относительно края карты (пиксели). Позволяет выровнять сетку по рисунку.
    gridOffsetX: {
      type: Number,
      default: 0,
    },
    gridOffsetY: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

mapSchema.index({ owner: 1 })

export default mongoose.model('Map', mapSchema)

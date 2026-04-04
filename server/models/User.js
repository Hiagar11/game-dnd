import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// Схема пользователя.
// В нашей игре пользователь один — DM (Dungeon Master).
// role зарезервировано на будущее: 'admin' | 'player'
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
    },
    // Пароль хранится только в виде хэша — bcryptjs никогда не сохраняет исходный текст
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'player'],
      default: 'admin',
    },
  },
  {
    // timestamps: true — MongoDB автоматически добавит createdAt и updatedAt
    timestamps: true,
  }
)

// Метод экземпляра — проверяет, совпадает ли введённый пароль с хэшем.
// Вызывается при логине: user.comparePassword(password)
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash)
}

export default mongoose.model('User', userSchema)

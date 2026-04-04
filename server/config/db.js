import mongoose from 'mongoose'

// Подключаемся к MongoDB один раз при старте сервера.
// MONGO_URI берётся из .env — это позволяет легко переключаться
// между локальной базой и облачным Atlas без изменения кода.
export async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('[DB] MongoDB connected:', mongoose.connection.host)
}

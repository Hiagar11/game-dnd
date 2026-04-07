// Скрипт создания тестовых пользователей.
// Запускать один раз: node server/scripts/seed.js
//
// Безопасно запускать повторно — если пользователь уже существует, ничего не произойдёт.

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '..', '.env') })

await mongoose.connect(process.env.MONGO_URI)

const seeds = [
  { username: 'root', password: 'root', role: 'admin' },
  { username: 'user', password: 'user', role: 'player' },
]

for (const seed of seeds) {
  const existing = await User.findOne({ username: seed.username })
  if (existing) {
    console.log(`[seed] Пользователь ${seed.username} уже существует, пропускаем.`)
  } else {
    const passwordHash = await bcrypt.hash(seed.password, 12)
    await User.create({ username: seed.username, passwordHash, role: seed.role })
    console.log(`[seed] Создан ${seed.role} "${seed.username}" (пароль: ${seed.password}).`)
  }
}

await mongoose.disconnect()

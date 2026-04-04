// Скрипт создания первого пользователя (root/root).
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

const existing = await User.findOne({ username: 'root' })

if (existing) {
  console.log('[seed] Пользователь root уже существует, пропускаем.')
} else {
  const passwordHash = await bcrypt.hash('root', 12)
  await User.create({ username: 'root', passwordHash, role: 'admin' })
  console.log('[seed] Пользователь root создан (логин: root, пароль: root).')
}

await mongoose.disconnect()

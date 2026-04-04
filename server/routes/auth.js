import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Регистрация нового пользователя.
// В продакшене этот роут стоит отключить после создания первого admin-аккаунта.
router.post('/register', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль минимум 6 символов' })
  }

  try {
    const exists = await User.findOne({ username })
    if (exists) {
      return res.status(409).json({ error: 'Пользователь уже существует' })
    }

    // Хэшируем пароль — cost factor 12 (хороший баланс безопасности/скорости)
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ username, passwordHash })

    res.status(201).json({ message: 'Пользователь создан', id: user._id })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Авторизация. Возвращает JWT-токен на клиент.
// Клиент сохраняет его и передаёт в заголовке Authorization: Bearer <token>.
router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' })
  }

  try {
    const user = await User.findOne({ username })

    // Специально не разделяем "пользователь не найден" и "неверный пароль" —
    // это защита от перебора: злоумышленник не знает, существует ли аккаунт.
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role },
    })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Проверка токена и получение данных текущего пользователя.
// Используется фронтом при перезагрузке страницы для восстановления сессии.
// requireAuth верифицирует JWT и кладёт данные в req.user — дублировать логику не нужно.
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }))

export default router

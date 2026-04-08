import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Token from '../models/Token.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── Multer: куда и как сохранять загружаемые изображения ────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', 'uploads', 'tokens')

// Создаём папку, если её нет (при первом запуске сервера)
await fs.mkdir(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // Формат: timestamp-оригинальное_имя.ext — уникально и читаемо
    const ext = path.extname(file.originalname).toLowerCase()
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_')
    cb(null, `${Date.now()}-${base}${ext}`)
  },
})

// Разрешаем только изображения — защита от загрузки произвольных файлов
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Разрешены только изображения (jpeg, png, webp, gif)'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ максимум
})

// ─── Все роуты требуют авторизации ───────────────────────────────────────────
router.use(requireAuth)

// ─── POST /api/tokens ─────────────────────────────────────────────────────────
// Создание нового токена с загрузкой изображения.
// multipart/form-data: поле 'image' — файл, остальное — текст.
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Изображение обязательно' })
  }

  const { name, strength, agility, intellect, charisma, tokenType } = req.body

  if (!name?.trim()) {
    // Удаляем загруженный файл, если имя не передано
    await fs.unlink(req.file.path).catch(() => {})
    return res.status(400).json({ error: 'Имя токена обязательно' })
  }

  try {
    // Сохраняем относительный путь — чтобы сервер мог переехать
    const imagePath = `uploads/tokens/${req.file.filename}`

    const token = await Token.create({
      owner: req.user.id,
      name: name.trim(),
      imagePath,
      tokenType: tokenType === 'hero' ? 'hero' : 'npc',
      stats: {
        strength: Number(strength) || 0,
        agility: Number(agility) || 0,
        intellect: Number(intellect) || 0,
        charisma: Number(charisma) || 0,
      },
    })

    res.status(201).json(formatToken(token, req))
  } catch {
    await fs.unlink(req.file.path).catch(() => {})
    res.status(500).json({ error: 'Ошибка сервера при создании токена' })
  }
})

// ─── GET /api/tokens ──────────────────────────────────────────────────────────
// Список токенов текущего пользователя.
router.get('/', async (req, res) => {
  try {
    const tokens = await Token.find({ owner: req.user.id }).sort({ createdAt: -1 })
    res.json(tokens.map((t) => formatToken(t, req)))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PUT /api/tokens/:id ──────────────────────────────────────────────────────
// Редактирование токена. Изображение не меняется — только имя и статы.
router.put('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })
  try {
    const token = await Token.findOne({ _id: req.params.id, owner: req.user.id })
    if (!token) return res.status(404).json({ error: 'Токен не найден' })

    const { name, strength, agility, intellect, charisma } = req.body

    // Number(val) может вернуть NaN или Infinity — проверяем перед записью
    const parseStat = (val) => {
      const n = Number(val)
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
    }

    if (name !== undefined) token.name = name.trim()
    if (strength !== undefined) {
      const v = parseStat(strength)
      if (v === null) return res.status(400).json({ error: 'strength: некорректное значение' })
      token.stats.strength = v
    }
    if (agility !== undefined) {
      const v = parseStat(agility)
      if (v === null) return res.status(400).json({ error: 'agility: некорректное значение' })
      token.stats.agility = v
    }
    if (intellect !== undefined) {
      const v = parseStat(intellect)
      if (v === null) return res.status(400).json({ error: 'intellect: некорректное значение' })
      token.stats.intellect = v
    }
    if (charisma !== undefined) {
      const v = parseStat(charisma)
      if (v === null) return res.status(400).json({ error: 'charisma: некорректное значение' })
      token.stats.charisma = v
    }

    await token.save()
    res.json(formatToken(token, req))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── DELETE /api/tokens/:id ───────────────────────────────────────────────────
// Удаление токена и его файла с диска.
router.delete('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })
  try {
    const token = await Token.findOne({ _id: req.params.id, owner: req.user.id })
    if (!token) return res.status(404).json({ error: 'Токен не найден' })

    // Удаляем файл изображения; ошибки игнорируем — файл мог быть удалён вручную
    const filePath = path.join(__dirname, '..', token.imagePath)
    await fs.unlink(filePath).catch(() => {})

    await token.deleteOne()
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── Хелпер: формат ответа ────────────────────────────────────────────────────
// Добавляем полный URL изображения, чтобы фронт не строил его сам.
function formatToken(token, req) {
  return {
    id: token._id,
    name: token.name,
    tokenType: token.tokenType ?? 'npc',
    imageUrl: `${req.protocol}://${req.get('host')}/${token.imagePath}`,
    stats: token.stats,
    createdAt: token.createdAt,
  }
}

export default router

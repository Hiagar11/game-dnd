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

  const { name, meleeDmg, rangedDmg, visionRange, defense, evasion, tokenType } = req.body

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
        meleeDmg: Number(meleeDmg) || 0,
        rangedDmg: Number(rangedDmg) || 0,
        visionRange: Number(visionRange) || 0,
        defense: Number(defense) || 0,
        evasion: Number(evasion) || 0,
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

    const { name, meleeDmg, rangedDmg, visionRange, defense, evasion } = req.body

    // Number(val) может вернуть NaN или Infinity — проверяем перед записью
    const parseStat = (val) => {
      const n = Number(val)
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
    }

    if (name !== undefined) token.name = name.trim()
    if (meleeDmg !== undefined) {
      const v = parseStat(meleeDmg)
      if (v === null) return res.status(400).json({ error: 'meleeDmg: некорректное значение' })
      token.stats.meleeDmg = v
    }
    if (rangedDmg !== undefined) {
      const v = parseStat(rangedDmg)
      if (v === null) return res.status(400).json({ error: 'rangedDmg: некорректное значение' })
      token.stats.rangedDmg = v
    }
    if (visionRange !== undefined) {
      const v = parseStat(visionRange)
      if (v === null) return res.status(400).json({ error: 'visionRange: некорректное значение' })
      token.stats.visionRange = v
    }
    if (defense !== undefined) {
      const v = parseStat(defense)
      if (v === null) return res.status(400).json({ error: 'defense: некорректное значение' })
      token.stats.defense = v
    }
    if (evasion !== undefined) {
      const v = parseStat(evasion)
      if (v === null) return res.status(400).json({ error: 'evasion: некорректное значение' })
      token.stats.evasion = v
    }

    await token.save()
    res.json(formatToken(token, req))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── DELETE /api/tokens/:id ───────────────────────────────────────────────────
// Удаление токена и его файла с диска.
router.delete('/:id', async (req, res) => {  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })  try {
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

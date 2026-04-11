import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Token from '../models/Token.js'
import Scenario from '../models/Scenario.js'
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

  const {
    name,
    npcName,
    strength,
    agility,
    intellect,
    charisma,
    tokenType,
    attitude,
    personality,
  } = req.body

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
      attitude: ['neutral', 'friendly', 'hostile'].includes(attitude) ? attitude : 'neutral',
      personality: typeof personality === 'string' ? personality.slice(0, 500) : '',
      npcName: typeof npcName === 'string' ? npcName.trim().slice(0, 40) : '',
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

    const { name, strength, agility, intellect, charisma, attitude } = req.body

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
    if (attitude !== undefined && ['neutral', 'friendly', 'hostile'].includes(attitude)) {
      token.attitude = attitude
    }
    if (req.body.personality !== undefined) {
      token.personality = String(req.body.personality).slice(0, 500)
    }
    if (req.body.npcName !== undefined) {
      token.npcName = String(req.body.npcName).trim().slice(0, 40)
    }

    // DM может вручную скорректировать уровень или обнулить XP (например, для быстрого теста)
    if (req.body.level !== undefined) {
      const v = Number(req.body.level)
      if (Number.isFinite(v) && v >= 1) token.level = Math.floor(v)
    }
    if (req.body.xp !== undefined) {
      const v = Number(req.body.xp)
      if (Number.isFinite(v) && v >= 0) token.xp = Math.floor(v)
    }

    await token.save()
    res.json(formatToken(token, req))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PATCH /api/tokens/:id/xp ────────────────────────────────────────────────
// Начисление очков опыта герою. Автоматически пересчитывает уровень.
// Body: { amount: number } — количество XP для добавления (>0).
// Возвращает обновлённый токен с новыми xp и level.
//
// Формула уровней:
//   xpForLevel(N) = 50 * N * (N-1)   — суммарный XP для достижения уровня N
//   Уровень N → N+1 требует: N * 100 XP
router.patch('/:id/xp', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })

  const amount = Number(req.body.amount)
  if (!Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: 'amount: должно быть положительным числом' })

  try {
    const token = await Token.findOne({ _id: req.params.id, owner: req.user.id })
    if (!token) return res.status(404).json({ error: 'Токен не найден' })

    token.xp = (token.xp ?? 0) + Math.floor(amount)

    // Пересчёт уровня: levelFromXp — обратная функция xpForLevel(N) = 50*N*(N-1)
    token.level = Math.max(1, Math.floor((1 + Math.sqrt(1 + token.xp / 12.5)) / 2))

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

    // Удаляем все размещённые экземпляры этого шаблона изо всех сценариев.
    // $pull — атомарная операция MongoDB: удаляет все элементы, совпадающие с условием.
    // updateMany — затрагивает все сценарии сразу, без перебора в JS.
    const tokenObjId = token._id
    await Scenario.updateMany(
      { 'placedTokens.tokenId': tokenObjId },
      {
        $pull: {
          placedTokens: { tokenId: tokenObjId },
          defaultPlacedTokens: { tokenId: tokenObjId },
        },
      }
    )
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
    npcName: token.npcName ?? '',
    tokenType: token.tokenType ?? 'npc',
    attitude: token.attitude ?? 'neutral',
    personality: token.personality ?? '',
    imageUrl: `${req.protocol}://${req.get('host')}/${token.imagePath}`,
    stats: token.stats,
    xp: token.xp ?? 0,
    level: token.level ?? 1,
    createdAt: token.createdAt,
  }
}

export default router

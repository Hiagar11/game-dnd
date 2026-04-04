import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Scenario from '../models/Scenario.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

// ─── Multer: загрузка изображений карты ──────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mapUploadDir = path.join(__dirname, '..', 'uploads', 'maps')

await fs.mkdir(mapUploadDir, { recursive: true })

const mapStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mapUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_')
    cb(null, `${Date.now()}-${base}${ext}`)
  },
})

const mapUpload = multer({
  storage: mapStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 МБ — карты бывают крупные
})

const router = Router()

// Все роуты требуют авторизации
router.use(requireAuth)

// ─── POST /api/scenarios/upload-map ─────────────────────────────────────────
// Загружает изображение карты на сервер. Возвращает путь и URL для превью.
// Должен быть зарегистрирован ДО /:id, иначе Express перепутает 'upload-map' с id.
router.post('/upload-map', requireAdmin, mapUpload.single('map'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не выбран' })
  // imagePath — относительный путь без ведущего /; используется при построении URL
  const mapImagePath = `uploads/maps/${req.file.filename}`
  const mapImageUrl = `${req.protocol}://${req.get('host')}/${mapImagePath}`
  res.json({ mapImageUrl, mapImagePath })
})

// ─── POST /api/scenarios ──────────────────────────────────────────────────────
// Создание нового сценария. Только для admin.
router.post('/', requireAdmin, async (req, res) => {
  const { name, mapImagePath, cellSize, placedTokens } = req.body

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Название обязательно' })
  }

  try {
    // Уникальность имени в рамках сценариев этого админа
    const exists = await Scenario.findOne({ owner: req.user.id, name: name.trim() })
    if (exists) {
      return res.status(409).json({ error: 'Сценарий с таким названием уже существует' })
    }

    const normalizedTokens = Array.isArray(placedTokens)
      ? placedTokens.map(({ uid, tokenId, col, row, hidden = false }) => ({
          uid: String(uid),
          tokenId: new mongoose.Types.ObjectId(String(tokenId)),
          col: Number(col),
          row: Number(row),
          hidden: Boolean(hidden),
        }))
      : []

    const scenario = await Scenario.create({
      owner: req.user.id,
      name: name.trim(),
      mapImagePath: mapImagePath || '',
      cellSize: Number(cellSize) || 60,
      placedTokens: normalizedTokens,
    })
    res.status(201).json(formatScenario(scenario, req))
  } catch (err) {
    console.error('[POST /api/scenarios]', err.message)
    res.status(500).json({ error: err.message || 'Ошибка сервера' })
  }
})

// ─── GET /api/scenarios ───────────────────────────────────────────────────────
// Список сценариев — admin видит свои, player видит все (чтобы подключиться).
// В ответе возвращается tokensCount — количество расставленных токенов.
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { owner: req.user.id } : {}
    const scenarios = await Scenario.find(filter)
      .select('name mapImagePath cellSize placedTokens createdAt')
      .sort({ createdAt: -1 })

    res.json(scenarios.map((s) => formatScenario(s, req)))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── GET /api/scenarios/:id ───────────────────────────────────────────────────
// Полные данные сценария. Player получает отфильтрованную версию (без hidden токенов).
router.get('/:id', async (req, res) => {
  try {
    const scenario = await Scenario.findById(req.params.id).populate(
      'placedTokens.tokenId',
      'name imagePath stats'
    )

    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })

    const isAdmin = req.user.role === 'admin'
    res.json(formatScenario(scenario, req, { full: true, showHidden: isAdmin }))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PUT /api/scenarios/:id ───────────────────────────────────────────────────
// Обновление мета-данных сценария (имя, карта, размер клетки). Только admin.
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const scenario = await Scenario.findById(req.params.id)
    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })

    const { name, mapImagePath, cellSize } = req.body
    if (name !== undefined) scenario.name = name.trim()
    if (mapImagePath !== undefined) scenario.mapImagePath = mapImagePath
    if (cellSize !== undefined) scenario.cellSize = Number(cellSize)

    await scenario.save()
    res.json(formatScenario(scenario, req))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PATCH /api/scenarios/:id/placed-tokens ───────────────────────────────────────
// Сохраняет расстановку токенов и опционально обновляет имя сценария.
// Роут защищён requireAdmin — дополнительная проверка владельца не нужна.
router.patch('/:id/placed-tokens', requireAdmin, async (req, res) => {
  try {
    const scenario = await Scenario.findById(req.params.id)
    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })

    const { placedTokens, name } = req.body
    if (!Array.isArray(placedTokens)) {
      return res.status(400).json({ error: 'placedTokens должен быть массивом' })
    }

    // Имя — опциональное, обновляем только если передано
    if (name && typeof name === 'string' && name.trim()) {
      scenario.name = name.trim()
    }

    scenario.placedTokens = placedTokens.map(({ uid, tokenId, col, row, hidden = false }) => ({
      uid,
      tokenId,
      col,
      row,
      hidden,
    }))

    await scenario.save()
    res.json({ ok: true, count: scenario.placedTokens.length, name: scenario.name })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── DELETE /api/scenarios/:id ────────────────────────────────────────────────
// Удаление сценария. Только admin.
// Вместе со сценарием удаляем файл карты с диска, чтобы не засорять uploads/.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const scenario = await Scenario.findByIdAndDelete(req.params.id)
    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })

    // Если у сценария была карта — удаляем файл. Ошибку игнорируем:
    // файл мог быть уже удалён вручную или путь мог не совпасть.
    if (scenario.mapImagePath) {
      const filePath = path.join(__dirname, '..', scenario.mapImagePath)
      await fs.unlink(filePath).catch(() => {})
    }

    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── Хелпер: форматирование вывода ───────────────────────────────────────────
// req нужен для построения абсолютного URL картинки карты (протокол + хост)
function formatScenario(scenario, req, { full = false, showHidden = false } = {}) {
  const mapImageUrl = scenario.mapImagePath
    ? `${req.protocol}://${req.get('host')}/${scenario.mapImagePath}`
    : null

  const base = {
    id: scenario._id,
    name: scenario.name,
    mapImagePath: scenario.mapImagePath,
    mapImageUrl,
    cellSize: scenario.cellSize,
    // Количество расставленных токенов — позволяет отличать «карту» (токенов = 0) от «уровня» (токены > 0)
    tokensCount: scenario.placedTokens?.length ?? 0,
    createdAt: scenario.createdAt,
  }

  if (!full) return base

  // Фильтруем скрытые токены для игроков
  const placedTokens = showHidden
    ? scenario.placedTokens
    : scenario.placedTokens.filter((pt) => !pt.hidden)

  return {
    ...base,
    placedTokens,
    revealedCells: scenario.revealedCells,
  }
}

export default router

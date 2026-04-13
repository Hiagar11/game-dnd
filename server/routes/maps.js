import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Map from '../models/Map.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

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
  limits: { fileSize: 20 * 1024 * 1024 },
})

const router = Router()

router.use(requireAuth)

// ─── POST /api/maps ─────────────────────────────────────────────────────────
// Загрузка карты в библиотеку: файл + имя. Создаёт запись Map в БД.
router.post('/', requireAdmin, mapUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не выбран' })

  const name = req.body.name?.trim()
  if (!name) {
    // Откатываем загруженный файл если имя не передано
    await fs.unlink(req.file.path).catch(() => {})
    return res.status(400).json({ error: 'Название обязательно' })
  }

  try {
    const imagePath = `uploads/maps/${req.file.filename}`
    const cellSize = Number(req.body.cellSize) || 60
    const gridOffsetX = Number(req.body.gridOffsetX) || 0
    const gridOffsetY = Number(req.body.gridOffsetY) || 0

    const map = await Map.create({
      owner: req.user.id,
      name,
      imagePath,
      cellSize,
      gridOffsetX,
      gridOffsetY,
    })

    res.status(201).json(formatMap(map, req))
  } catch (err) {
    // Откатываем файл при ошибке БД
    await fs.unlink(req.file.path).catch(() => {})
    console.error('[POST /api/maps]', err.message)
    res.status(500).json({ error: err.message || 'Ошибка сервера' })
  }
})

// ─── GET /api/maps ──────────────────────────────────────────────────────────
// Список карт текущего admin-пользователя.
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { owner: req.user.id } : {}
    const maps = await Map.find(filter).sort({ createdAt: -1 })
    res.json(maps.map((m) => formatMap(m, req)))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PUT /api/maps/:id ─────────────────────────────────────────────────────
// Обновление мета-данных карты (имя, cellSize). Замена изображения — через отдельный PATCH.
router.put('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })

  try {
    const map = await Map.findById(req.params.id)
    if (!map) return res.status(404).json({ error: 'Карта не найдена' })
    if (String(map.owner) !== String(req.user.id))
      return res.status(403).json({ error: 'Нет доступа' })

    const { name, cellSize, gridOffsetX, gridOffsetY } = req.body
    if (name !== undefined) map.name = name.trim()
    if (cellSize !== undefined) map.cellSize = Number(cellSize)
    if (gridOffsetX !== undefined) map.gridOffsetX = Number(gridOffsetX)
    if (gridOffsetY !== undefined) map.gridOffsetY = Number(gridOffsetY)

    await map.save()
    res.json(formatMap(map, req))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PATCH /api/maps/:id/image ──────────────────────────────────────────────
// Замена изображения карты. Старый файл удаляется.
router.patch('/:id/image', requireAdmin, mapUpload.single('image'), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })
  if (!req.file) return res.status(400).json({ error: 'Файл не выбран' })

  try {
    const map = await Map.findById(req.params.id)
    if (!map) {
      await fs.unlink(req.file.path).catch(() => {})
      return res.status(404).json({ error: 'Карта не найдена' })
    }
    if (String(map.owner) !== String(req.user.id)) {
      await fs.unlink(req.file.path).catch(() => {})
      return res.status(403).json({ error: 'Нет доступа' })
    }

    // Удаляем старый файл
    const oldPath = path.join(__dirname, '..', map.imagePath)
    await fs.unlink(oldPath).catch(() => {})

    map.imagePath = `uploads/maps/${req.file.filename}`
    await map.save()
    res.json(formatMap(map, req))
  } catch {
    await fs.unlink(req.file.path).catch(() => {})
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── DELETE /api/maps/:id ───────────────────────────────────────────────────
// Удаляет карту из библиотеки и файл с диска.
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })

  try {
    const map = await Map.findOne({ _id: req.params.id, owner: req.user.id })
    if (!map) return res.status(404).json({ error: 'Карта не найдена' })

    await map.deleteOne()

    // Удаляем файл с диска
    const filePath = path.join(__dirname, '..', map.imagePath)
    await fs.unlink(filePath).catch(() => {})

    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── Хелпер: форматирование вывода ─────────────────────────────────────────
function formatMap(map, req) {
  const imageUrl = map.imagePath ? `${req.protocol}://${req.get('host')}/${map.imagePath}` : null

  return {
    id: map._id,
    name: map.name,
    imagePath: map.imagePath,
    imageUrl,
    cellSize: map.cellSize,
    gridOffsetX: map.gridOffsetX ?? 0,
    gridOffsetY: map.gridOffsetY ?? 0,
    createdAt: map.createdAt,
  }
}

export default router

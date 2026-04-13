import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import GlobalMap from '../models/GlobalMap.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', 'uploads', 'maps')

await fs.mkdir(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_')
    cb(null, `${Date.now()}-gm-${base}${ext}`)
  },
})

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
  limits: { fileSize: 20 * 1024 * 1024 },
})

const router = Router()

router.use(requireAuth)

// ─── POST /api/global-maps ──────────────────────────────────────────────────
// Загрузка глобальной карты: файл + имя.
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не выбран' })

  const name = req.body.name?.trim()
  if (!name) {
    await fs.unlink(req.file.path).catch(() => {})
    return res.status(400).json({ error: 'Название обязательно' })
  }

  try {
    const gm = await GlobalMap.create({
      owner: req.user.id,
      name,
      imagePath: `uploads/maps/${req.file.filename}`,
      stops: [],
      paths: [],
    })
    res.status(201).json(format(gm, req))
  } catch (err) {
    await fs.unlink(req.file.path).catch(() => {})
    console.error('[POST /api/global-maps]', err.message)
    res.status(500).json({ error: err.message || 'Ошибка сервера' })
  }
})

// ─── GET /api/global-maps ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { owner: req.user.id } : {}
    const list = await GlobalMap.find(filter).sort({ createdAt: -1 })
    res.json(list.map((gm) => format(gm, req)))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── GET /api/global-maps/:id ───────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })

  try {
    const gm = await GlobalMap.findById(req.params.id)
    if (!gm) return res.status(404).json({ error: 'Глобальная карта не найдена' })
    res.json(format(gm, req))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PUT /api/global-maps/:id ───────────────────────────────────────────────
// Обновление мета-данных: имя, остановки, маршруты.
router.put('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })

  try {
    const gm = await GlobalMap.findById(req.params.id)
    if (!gm) return res.status(404).json({ error: 'Карта не найдена' })
    if (String(gm.owner) !== String(req.user.id))
      return res.status(403).json({ error: 'Нет доступа' })

    const { name, stops, paths: newPaths } = req.body
    if (name !== undefined) gm.name = name.trim()
    if (Array.isArray(stops)) gm.stops = stops
    if (Array.isArray(newPaths)) gm.paths = newPaths

    await gm.save()
    res.json(format(gm, req))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PATCH /api/global-maps/:id/image ───────────────────────────────────────
router.patch('/:id/image', requireAdmin, upload.single('image'), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })
  if (!req.file) return res.status(400).json({ error: 'Файл не выбран' })

  try {
    const gm = await GlobalMap.findById(req.params.id)
    if (!gm) {
      await fs.unlink(req.file.path).catch(() => {})
      return res.status(404).json({ error: 'Карта не найдена' })
    }
    if (String(gm.owner) !== String(req.user.id)) {
      await fs.unlink(req.file.path).catch(() => {})
      return res.status(403).json({ error: 'Нет доступа' })
    }

    const oldPath = path.join(__dirname, '..', gm.imagePath)
    await fs.unlink(oldPath).catch(() => {})

    gm.imagePath = `uploads/maps/${req.file.filename}`
    await gm.save()
    res.json(format(gm, req))
  } catch {
    await fs.unlink(req.file.path).catch(() => {})
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── DELETE /api/global-maps/:id ────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })

  try {
    const gm = await GlobalMap.findOne({ _id: req.params.id, owner: req.user.id })
    if (!gm) return res.status(404).json({ error: 'Карта не найдена' })

    await gm.deleteOne()

    const filePath = path.join(__dirname, '..', gm.imagePath)
    await fs.unlink(filePath).catch(() => {})

    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── Хелпер: форматирование вывода ─────────────────────────────────────────
function format(gm, req) {
  const imageUrl = gm.imagePath ? `${req.protocol}://${req.get('host')}/${gm.imagePath}` : null

  return {
    id: gm._id,
    name: gm.name,
    imagePath: gm.imagePath,
    imageUrl,
    stops: gm.stops ?? [],
    paths: gm.paths ?? [],
    createdAt: gm.createdAt,
  }
}

export default router

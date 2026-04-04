import { Router } from 'express'
import Scenario from '../models/Scenario.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

// Все роуты требуют авторизации
router.use(requireAuth)

// ─── POST /api/scenarios ──────────────────────────────────────────────────────
// Создание нового сценария. Только для admin.
router.post('/', requireAdmin, async (req, res) => {
  const { name, mapImagePath, cellSize } = req.body

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Название сценария обязательно' })
  }

  try {
    const scenario = await Scenario.create({
      owner: req.user.id,
      name: name.trim(),
      mapImagePath: mapImagePath || '',
      cellSize: Number(cellSize) || 50,
    })
    res.status(201).json(formatScenario(scenario))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── GET /api/scenarios ───────────────────────────────────────────────────────
// Список сценариев — admin видит свои, player видит все (чтобы подключиться).
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { owner: req.user.id } : {}
    const scenarios = await Scenario.find(filter)
      .select('name mapImagePath cellSize createdAt')
      .sort({ createdAt: -1 })

    res.json(scenarios.map(formatScenario))
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
    res.json(formatScenario(scenario, { full: true, showHidden: isAdmin }))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PUT /api/scenarios/:id ───────────────────────────────────────────────────
// Обновление мета-данных сценария (имя, карта, размер клетки). Только admin.
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const scenario = await Scenario.findOne({ _id: req.params.id, owner: req.user.id })
    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })

    const { name, mapImagePath, cellSize } = req.body
    if (name !== undefined) scenario.name = name.trim()
    if (mapImagePath !== undefined) scenario.mapImagePath = mapImagePath
    if (cellSize !== undefined) scenario.cellSize = Number(cellSize)

    await scenario.save()
    res.json(formatScenario(scenario))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── DELETE /api/scenarios/:id ────────────────────────────────────────────────
// Удаление сценария. Только admin-владелец.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const scenario = await Scenario.findOneAndDelete({ _id: req.params.id, owner: req.user.id })
    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── Хелпер: форматирование вывода ───────────────────────────────────────────
function formatScenario(scenario, { full = false, showHidden = false } = {}) {
  const base = {
    id: scenario._id,
    name: scenario.name,
    mapImagePath: scenario.mapImagePath,
    cellSize: scenario.cellSize,
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

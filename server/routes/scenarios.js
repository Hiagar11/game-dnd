import { Router } from 'express'
import mongoose from 'mongoose'
import Scenario from '../models/Scenario.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

// Все роуты требуют авторизации
router.use(requireAuth)

// ─── POST /api/scenarios ──────────────────────────────────────────────────────
// Создание нового сценария. Только для admin.
router.post('/', requireAdmin, async (req, res) => {
  const {
    name,
    mapImagePath,
    cellSize,
    gridOffsetX,
    gridOffsetY,
    placedTokens,
    walls,
    locationDescription,
  } = req.body

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
      ? placedTokens.map(
          ({
            uid,
            tokenId,
            systemToken,
            targetScenarioId,
            globalMapExit,
            col,
            row,
            hidden = false,
            inventory,
          }) => ({
            uid: String(uid),
            // Системные токены (дверь, ловушка) не ссылаются на шаблон Token —
            // они хранятся через поле systemToken.
            ...(systemToken
              ? { systemToken: String(systemToken) }
              : { tokenId: new mongoose.Types.ObjectId(String(tokenId)) }),
            targetScenarioId: targetScenarioId
              ? new mongoose.Types.ObjectId(String(targetScenarioId))
              : null,
            globalMapExit: Boolean(globalMapExit),
            col: Number(col),
            row: Number(row),
            hidden: Boolean(hidden),
            inventory: inventory ?? null,
          })
        )
      : []

    const scenario = await Scenario.create({
      owner: req.user.id,
      name: name.trim(),
      mapImagePath: mapImagePath || '',
      cellSize: Number(cellSize) || 60,
      gridOffsetX: Number(gridOffsetX) || 0,
      gridOffsetY: Number(gridOffsetY) || 0,
      locationDescription:
        typeof locationDescription === 'string' ? locationDescription.slice(0, 600) : '',
      placedTokens: normalizedTokens,
      defaultPlacedTokens: normalizedTokens,
      walls: Array.isArray(walls)
        ? walls.map(({ col, row }) => ({ col: Number(col), row: Number(row) }))
        : [],
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
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })
  try {
    const scenario = await Scenario.findById(req.params.id).populate(
      'placedTokens.tokenId',
      'name imagePath stats attitude tokenType'
    )

    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })

    // Admin видит только свои сценарии
    if (req.user.role === 'admin' && String(scenario.owner) !== String(req.user.id))
      return res.status(403).json({ error: 'Нет доступа' })

    const isAdmin = req.user.role === 'admin'
    res.json(formatScenario(scenario, req, { full: true, showHidden: isAdmin }))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PUT /api/scenarios/:id ───────────────────────────────────────────────────
// Обновление мета-данных сценария (имя, карта, размер клетки). Только admin.
router.put('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })
  try {
    const scenario = await Scenario.findById(req.params.id)
    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })
    if (String(scenario.owner) !== String(req.user.id))
      return res.status(403).json({ error: 'Нет доступа' })

    const { name, mapImagePath, cellSize, gridOffsetX, gridOffsetY, locationDescription } = req.body
    if (name !== undefined) scenario.name = name.trim()
    if (mapImagePath !== undefined) scenario.mapImagePath = mapImagePath
    if (cellSize !== undefined) scenario.cellSize = Number(cellSize)
    if (gridOffsetX !== undefined) scenario.gridOffsetX = Number(gridOffsetX)
    if (gridOffsetY !== undefined) scenario.gridOffsetY = Number(gridOffsetY)
    if (locationDescription !== undefined)
      scenario.locationDescription = String(locationDescription).slice(0, 600)

    await scenario.save()
    res.json(formatScenario(scenario, req))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── PATCH /api/scenarios/:id/placed-tokens ───────────────────────────────────────
// Сохраняет расстановку токенов и опционально обновляет имя сценария.
router.patch('/:id/placed-tokens', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })
  try {
    const scenario = await Scenario.findById(req.params.id)
    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })
    if (String(scenario.owner) !== String(req.user.id))
      return res.status(403).json({ error: 'Нет доступа' })

    const { placedTokens, name, walls } = req.body
    if (!Array.isArray(placedTokens)) {
      return res.status(400).json({ error: 'placedTokens должен быть массивом' })
    }

    // Имя — опциональное, обновляем только если передано
    if (name && typeof name === 'string' && name.trim()) {
      scenario.name = name.trim()
    }

    scenario.placedTokens = placedTokens.map(
      ({
        uid,
        tokenId,
        systemToken,
        targetScenarioId,
        globalMapExit,
        col,
        row,
        hidden = false,
        inventory,
      }) => ({
        uid,
        ...(systemToken
          ? { systemToken: String(systemToken) }
          : { tokenId: tokenId ? new mongoose.Types.ObjectId(String(tokenId)) : null }),
        targetScenarioId: targetScenarioId
          ? new mongoose.Types.ObjectId(String(targetScenarioId))
          : null,
        globalMapExit: Boolean(globalMapExit),
        col,
        row,
        hidden,
        inventory: inventory ?? null,
      })
    )
    // Редактор устанавливает эталон — синхронно обновляем defaultPlacedTokens
    scenario.defaultPlacedTokens = scenario.placedTokens

    // Стены эталона тоже обновляем если переданы
    if (Array.isArray(walls)) {
      scenario.walls = walls.map(({ col, row }) => ({ col: Number(col), row: Number(row) }))
    }

    await scenario.save()
    res.json({ ok: true, count: scenario.placedTokens.length, name: scenario.name })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── POST /api/scenarios/:id/reset ───────────────────────────────────────────
// Сбрасывает placedTokens и revealedCells к эталонному состоянию редактора.
// Вызывается перед запуском новой игры, чтобы не затронуть сохранённые сессии.
router.post('/:id/reset', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })
  try {
    const scenario = await Scenario.findById(req.params.id)
    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })
    if (String(scenario.owner) !== String(req.user.id))
      return res.status(403).json({ error: 'Нет доступа' })

    scenario.placedTokens = scenario.defaultPlacedTokens
    scenario.revealedCells = []
    await scenario.save()

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// ─── DELETE /api/scenarios/:id ────────────────────────────────────────────────
// Удаляет сценарий. Файл карты НЕ удаляется — им владеет библиотека карт (Map).
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })
  try {
    const scenario = await Scenario.findOne({ _id: req.params.id, owner: req.user.id })
    if (!scenario) return res.status(404).json({ error: 'Сценарий не найден' })
    await scenario.deleteOne()

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
    gridOffsetX: scenario.gridOffsetX ?? 0,
    gridOffsetY: scenario.gridOffsetY ?? 0,
    locationDescription: scenario.locationDescription ?? '',
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
    walls: scenario.walls ?? [],
    revealedCells: scenario.revealedCells,
  }
}

export default router

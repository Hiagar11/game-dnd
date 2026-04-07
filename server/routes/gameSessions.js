import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import GameSession from '../models/GameSession.js'
import Scenario from '../models/Scenario.js'

const router = Router()
router.use(requireAuth)

// GET /api/game-sessions
// Список сохранённых сессий текущего пользователя, новые первыми.
router.get('/', async (req, res) => {
  try {
    const sessions = await GameSession.find({ owner: req.user.id })
      .select('name campaignId campaignName currentScenarioId currentScenarioName updatedAt')
      .sort('-updatedAt')
      .lean()
    res.json(
      sessions.map((s) => ({
        id: s._id,
        name: s.name,
        campaignId: s.campaignId,
        campaignName: s.campaignName,
        currentScenarioId: s.currentScenarioId,
        currentScenarioName: s.currentScenarioName,
        updatedAt: s.updatedAt,
      }))
    )
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// POST /api/game-sessions
// Создаёт или обновляет сессию (upsert по имени).
// Захватывает текущее состояние сценария (placedTokens, revealedCells) как снапшот.
router.post('/', async (req, res) => {
  try {
    const { name, campaignId, campaignName, currentScenarioId, currentScenarioName } = req.body
    if (!name || !campaignId || !currentScenarioId) {
      return res
        .status(400)
        .json({ error: 'Обязательные поля: name, campaignId, currentScenarioId' })
    }

    // Захватываем текущее состояние сценария
    const scenario = await Scenario.findById(currentScenarioId).lean()
    const placedTokens = scenario?.placedTokens ?? []
    const revealedCells = scenario?.revealedCells ?? []

    const session = await GameSession.findOneAndUpdate(
      { owner: req.user.id, name },
      {
        campaignId,
        campaignName: campaignName ?? '',
        currentScenarioId,
        currentScenarioName: currentScenarioName ?? '',
        placedTokens,
        revealedCells,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )
    res.json({ id: session._id, ...session.toObject() })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// POST /api/game-sessions/:id/restore
// Восстанавливает снапшот сессии обратно в сценарий.
// Вызывается при продолжении сохранённой игры.
router.post('/:id/restore', async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.id, owner: req.user.id }).lean()
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })

    await Scenario.findByIdAndUpdate(session.currentScenarioId, {
      $set: {
        placedTokens: session.placedTokens ?? [],
        revealedCells: session.revealedCells ?? [],
      },
    })

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// DELETE /api/game-sessions/:id
// Удаляет сохранение (только своё).
router.delete('/:id', async (req, res) => {
  try {
    await GameSession.findOneAndDelete({ _id: req.params.id, owner: req.user.id })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

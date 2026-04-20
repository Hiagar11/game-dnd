import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { generateAbilityHints } from '../ai/npcChat.js'

const router = Router()

// POST /api/ai/ability-hints
// Принимает массив «почти открытых» способностей и возвращает AI-подсказки.
router.post('/ability-hints', requireAuth, async (req, res) => {
  const { abilities } = req.body
  if (!Array.isArray(abilities) || !abilities.length) {
    return res.status(400).json({ error: 'abilities — обязательный массив' })
  }

  // Валидация: каждый элемент должен содержать name, description
  const valid = abilities.every(
    (a) => typeof a.name === 'string' && typeof a.description === 'string'
  )
  if (!valid) {
    return res.status(400).json({ error: 'Каждый элемент: { name, description }' })
  }

  // Ограничиваем до 8 способностей — защита от злоупотреблений
  const capped = abilities.slice(0, 8)

  try {
    const hints = await generateAbilityHints(capped)
    return res.json({ hints })
  } catch (err) {
    console.error('[ai] ability-hints error:', err.message)
    return res.status(500).json({ error: 'Не удалось сгенерировать подсказки' })
  }
})

export default router

import { Router } from 'express'
import mongoose from 'mongoose'
import Campaign from '../models/Campaign.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Форматирует документ кампании для отправки клиенту
function format(campaign) {
  return {
    id: String(campaign._id),
    name: campaign.name,
    nodes: campaign.nodes.map((n) => ({
      scenarioId: String(n.scenarioId),
      x: n.x,
      y: n.y,
    })),
    edges: campaign.edges.map((e) => ({
      from: String(e.from),
      to: String(e.to),
    })),
    startScenarioId: campaign.startScenarioId ? String(campaign.startScenarioId) : null,
    updatedAt: campaign.updatedAt,
  }
}

function toObjectId(str) {
  return new mongoose.Types.ObjectId(String(str))
}

function normalizeNodes(nodes) {
  return (nodes ?? []).map(({ scenarioId, x, y }) => ({
    scenarioId: toObjectId(scenarioId),
    x: Number(x) || 0,
    y: Number(y) || 0,
  }))
}

function normalizeEdges(edges) {
  return (edges ?? []).map(({ from, to }) => ({
    from: toObjectId(from),
    to: toObjectId(to),
  }))
}

// ─── GET /api/campaigns ─────────────────────────────────────────────────────
// Admin видит свои, player — все (для доступа во время игры)
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { owner: req.user.id } : {}
    const campaigns = await Campaign.find(filter).sort({ updatedAt: -1 })
    res.json(campaigns.map(format))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/campaigns ────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { name, nodes, edges, startScenarioId } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Название обязательно' })
  try {
    const campaign = await Campaign.create({
      owner: req.user.id,
      name: name.trim(),
      nodes: normalizeNodes(nodes),
      edges: normalizeEdges(edges),
      startScenarioId: startScenarioId ? toObjectId(startScenarioId) : null,
    })
    res.status(201).json(format(campaign))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── PUT /api/campaigns/:id ─────────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })  const { name, nodes, edges, startScenarioId } = req.body
  try {
    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Сценарий не найден' })
    if (String(campaign.owner) !== String(req.user.id))
      return res.status(403).json({ error: 'Нет доступа' })

    if (name?.trim()) campaign.name = name.trim()
    if (nodes !== undefined) campaign.nodes = normalizeNodes(nodes)
    if (edges !== undefined) campaign.edges = normalizeEdges(edges)
    if (startScenarioId !== undefined)
      campaign.startScenarioId = startScenarioId ? toObjectId(startScenarioId) : null

    await campaign.save()
    res.json(format(campaign))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── DELETE /api/campaigns/:id ──────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ error: 'Некорректный id' })  try {
    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Сценарий не найден' })
    if (String(campaign.owner) !== String(req.user.id))
      return res.status(403).json({ error: 'Нет доступа' })
    await campaign.deleteOne()
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

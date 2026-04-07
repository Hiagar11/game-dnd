// Composable для интерактивного графа сценария (EditorScenarioSection).
// Управляет: позициями узлов, рёбрами, перетаскиванием, созданием связей.
import { ref, reactive, computed } from 'vue'
import { useScenariosStore } from '../stores/scenarios'

const NODE_W = 160
const NODE_H = 110
const GRID_COLS = 4
const GRID_GAP = 52
// Драг активируется только при движении курсора больше этого порога (пикс.)
const DRAG_THRESHOLD = 5

export function useScenarioGraph() {
  const scenariosStore = useScenariosStore()

  const canvasRef = ref(null)

  // nodePos[scenarioId] = { x, y } — позиция левого верхнего угла карточки
  const nodePos = reactive({})
  const edges = ref([])

  // Состояние перетаскивания узла
  const draggingNodeId = ref(null)
  const pendingDrag = ref(null)
  const _dragOffset = { x: 0, y: 0 }

  // Состояние создания ребра (тянем с порта)
  const connecting = ref(false)
  const connectingFromId = ref(null)
  const connectingStart = ref({ x: 0, y: 0 })
  const connectingEnd = ref({ x: 0, y: 0 })
  const hoveredNodeId = ref(null)

  // ─── Уровни (заполненные сценарии) ───────────────────────────────────────────
  const levels = computed(() => scenariosStore.scenarios.filter((s) => s.tokensCount > 0))

  function defaultX(i) {
    return (i % GRID_COLS) * (NODE_W + GRID_GAP) + GRID_GAP
  }
  function defaultY(i) {
    return Math.floor(i / GRID_COLS) * (NODE_H + GRID_GAP) + GRID_GAP
  }

  const levelsWithNodes = computed(() =>
    levels.value.map((s, i) => {
      const sid = String(s.id)
      return {
        scenarioId: sid,
        scenario: s,
        x: nodePos[sid]?.x ?? defaultX(i),
        y: nodePos[sid]?.y ?? defaultY(i),
      }
    })
  )

  const displayEdges = computed(() =>
    edges.value.flatMap((edge) => {
      const fn = levelsWithNodes.value.find((n) => n.scenarioId === edge.from)
      const tn = levelsWithNodes.value.find((n) => n.scenarioId === edge.to)
      if (!fn || !tn) return []
      return [
        {
          key: `${edge.from}__${edge.to}`,
          x1: fn.x + NODE_W / 2,
          y1: fn.y + NODE_H / 2,
          x2: tn.x + NODE_W / 2,
          y2: tn.y + NODE_H / 2,
          from: edge.from,
          to: edge.to,
        },
      ]
    })
  )

  // ─── Координаты относительно холста (учитываем scroll) ───────────────────────
  function canvasPos(e) {
    const c = canvasRef.value
    const r = c.getBoundingClientRect()
    return { x: e.clientX - r.left + c.scrollLeft, y: e.clientY - r.top + c.scrollTop }
  }

  // ─── Перемещение узла ────────────────────────────────────────────────────────
  function startNodeDrag(e, node) {
    if (e.target.classList.contains('scenario-node__port')) return
    e.preventDefault()
    const pos = canvasPos(e)
    pendingDrag.value = {
      nodeId: node.scenarioId,
      startX: pos.x,
      startY: pos.y,
      offsetX: pos.x - node.x,
      offsetY: pos.y - node.y,
    }
  }

  // ─── Создание связи с порта ──────────────────────────────────────────────────
  function startConnect(e, node) {
    e.preventDefault()
    connecting.value = true
    connectingFromId.value = node.scenarioId
    connectingStart.value = { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 }
    connectingEnd.value = canvasPos(e)
  }

  // ─── Движение мыши ───────────────────────────────────────────────────────────
  function onMouseMove(e) {
    const pos = canvasPos(e)
    if (pendingDrag.value && !draggingNodeId.value) {
      const dx = Math.abs(pos.x - pendingDrag.value.startX)
      const dy = Math.abs(pos.y - pendingDrag.value.startY)
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        draggingNodeId.value = pendingDrag.value.nodeId
        _dragOffset.x = pendingDrag.value.offsetX
        _dragOffset.y = pendingDrag.value.offsetY
        pendingDrag.value = null
      }
    }
    if (draggingNodeId.value) {
      nodePos[draggingNodeId.value] = {
        x: Math.max(0, pos.x - _dragOffset.x),
        y: Math.max(0, pos.y - _dragOffset.y),
      }
    }
    if (connecting.value) connectingEnd.value = pos
  }

  function onMouseUp() {
    if (
      connecting.value &&
      connectingFromId.value &&
      hoveredNodeId.value &&
      hoveredNodeId.value !== connectingFromId.value
    ) {
      addEdge(connectingFromId.value, hoveredNodeId.value)
    }
    connecting.value = false
    connectingFromId.value = null
    draggingNodeId.value = null
    pendingDrag.value = null
  }

  // ─── Управление рёбрами ──────────────────────────────────────────────────────
  function addEdge(fromId, toId) {
    const exists = edges.value.some(
      (e) => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    )
    if (!exists) edges.value.push({ from: fromId, to: toId })
  }

  function removeEdge(edge) {
    edges.value = edges.value.filter(
      (e) =>
        !((e.from === edge.from && e.to === edge.to) || (e.from === edge.to && e.to === edge.from))
    )
  }

  // ─── Восстановление из кампании ──────────────────────────────────────────────
  function loadGraphFromCampaign(campaign) {
    Object.keys(nodePos).forEach((k) => delete nodePos[k])
    for (const node of campaign.nodes) {
      nodePos[String(node.scenarioId)] = { x: node.x, y: node.y }
    }
    edges.value = campaign.edges.map((e) => ({ from: String(e.from), to: String(e.to) }))
  }

  function resetGraph() {
    Object.keys(nodePos).forEach((k) => delete nodePos[k])
    edges.value = []
  }

  return {
    canvasRef,
    nodePos,
    edges,
    NODE_W,
    NODE_H,
    draggingNodeId,
    connecting,
    connectingFromId,
    connectingStart,
    connectingEnd,
    hoveredNodeId,
    levels,
    levelsWithNodes,
    displayEdges,
    startNodeDrag,
    startConnect,
    onMouseMove,
    onMouseUp,
    addEdge,
    removeEdge,
    loadGraphFromCampaign,
    resetGraph,
  }
}

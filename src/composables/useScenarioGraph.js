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

// Виртуальный id узла глобальной карты в графе
const GLOBAL_MAP_NODE_ID = '__globalMap__'

export function useScenarioGraph() {
  const scenariosStore = useScenariosStore()

  const canvasRef = ref(null)

  // nodePos[scenarioId] = { x, y } — позиция левого верхнего угла карточки
  const nodePos = reactive({})
  const edges = ref([])

  // Данные глобальной карты (устанавливаются снаружи)
  const globalMapData = ref(null)

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

  // Колбэк — вызывается, когда ребро тянут К глобальной карте.
  // EditorScenarioSection подставит сюда функцию открытия попапа.
  let onConnectToGlobalMap = null
  function setOnConnectToGlobalMap(fn) {
    onConnectToGlobalMap = fn
  }

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

  // Узел глобальной карты (если она задана)
  const globalMapNode = computed(() => {
    if (!globalMapData.value) return null
    const pos = nodePos[GLOBAL_MAP_NODE_ID]
    // Позиция по умолчанию — правее всех карточек сценариев
    const defaultGX = (levels.value.length % GRID_COLS) * (NODE_W + GRID_GAP) + GRID_GAP
    const defaultGY = Math.floor(levels.value.length / GRID_COLS) * (NODE_H + GRID_GAP) + GRID_GAP
    return {
      scenarioId: GLOBAL_MAP_NODE_ID,
      globalMap: globalMapData.value,
      x: pos?.x ?? defaultGX,
      y: pos?.y ?? defaultGY,
    }
  })

  // Все узлы: сценарии + глобальная карта (для расчёта рёбер)
  const allNodes = computed(() => {
    const arr = [...levelsWithNodes.value]
    if (globalMapNode.value) arr.push(globalMapNode.value)
    return arr
  })

  const displayEdges = computed(() =>
    edges.value.flatMap((edge) => {
      const fromId = edge.from
      // Если edge.to === null и есть stopUid — ребро к глобальной карте
      const toId = edge.to ?? GLOBAL_MAP_NODE_ID
      const fn = allNodes.value.find((n) => n.scenarioId === fromId)
      const tn = allNodes.value.find((n) => n.scenarioId === toId)
      if (!fn || !tn) return []

      // Для рёбер к глобальной карте — название остановки
      let stopLabel = null
      if (edge.to === null && edge.stopUid && globalMapData.value) {
        const stop = globalMapData.value.stops?.find((s) => s.uid === edge.stopUid)
        stopLabel = stop?.label || null
      }

      return [
        {
          key: `${fromId}__${toId}__${edge.stopUid || ''}`,
          x1: fn.x + NODE_W / 2,
          y1: fn.y + NODE_H / 2,
          x2: tn.x + NODE_W / 2,
          y2: tn.y + NODE_H / 2,
          from: edge.from,
          to: edge.to,
          stopUid: edge.stopUid || null,
          stopLabel,
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
      // Если тянем К глобальной карте — вызываем колбэк для попапа выбора остановки
      if (hoveredNodeId.value === GLOBAL_MAP_NODE_ID && onConnectToGlobalMap) {
        onConnectToGlobalMap(connectingFromId.value)
      } else if (connectingFromId.value !== GLOBAL_MAP_NODE_ID) {
        // Обычная связь между двумя сценариями
        addEdge(connectingFromId.value, hoveredNodeId.value)
      }
    }
    connecting.value = false
    connectingFromId.value = null
    draggingNodeId.value = null
    pendingDrag.value = null
  }

  // ─── Управление рёбрами ──────────────────────────────────────────────────────
  // stopUid передаётся для рёбер «сценарий → глобальная карта»
  function addEdge(fromId, toId, stopUid = null) {
    const isGlobalTarget = toId === GLOBAL_MAP_NODE_ID
    const targetTo = isGlobalTarget ? null : toId
    const exists = edges.value.some((e) => {
      if (isGlobalTarget) return e.from === fromId && e.to === null && e.stopUid === stopUid
      return (e.from === fromId && e.to === targetTo) || (e.from === targetTo && e.to === fromId)
    })
    if (!exists) edges.value.push({ from: fromId, to: targetTo, stopUid: stopUid || null })
  }

  function removeEdge(edge) {
    edges.value = edges.value.filter((e) => {
      // Ребро к глобальной карте: совпадение по from + stopUid
      if (edge.to === null && edge.stopUid) {
        return !(e.from === edge.from && e.to === null && e.stopUid === edge.stopUid)
      }
      return !(
        (e.from === edge.from && e.to === edge.to) ||
        (e.from === edge.to && e.to === edge.from)
      )
    })
  }

  // ─── Восстановление из кампании ──────────────────────────────────────────────
  function loadGraphFromCampaign(campaign) {
    Object.keys(nodePos).forEach((k) => delete nodePos[k])
    for (const node of campaign.nodes) {
      nodePos[String(node.scenarioId)] = { x: node.x, y: node.y }
    }
    // Восстанавливаем позицию карточки глобальной карты
    if (campaign.globalMapNodeX != null && campaign.globalMapNodeY != null) {
      nodePos[GLOBAL_MAP_NODE_ID] = { x: campaign.globalMapNodeX, y: campaign.globalMapNodeY }
    }
    edges.value = campaign.edges.map((e) => ({
      from: String(e.from),
      to: e.to ? String(e.to) : null,
      stopUid: e.stopUid || null,
    }))
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
    GLOBAL_MAP_NODE_ID,
    draggingNodeId,
    connecting,
    connectingFromId,
    connectingStart,
    connectingEnd,
    hoveredNodeId,
    levels,
    levelsWithNodes,
    globalMapData,
    globalMapNode,
    allNodes,
    displayEdges,
    startNodeDrag,
    startConnect,
    onMouseMove,
    onMouseUp,
    addEdge,
    removeEdge,
    loadGraphFromCampaign,
    resetGraph,
    setOnConnectToGlobalMap,
  }
}

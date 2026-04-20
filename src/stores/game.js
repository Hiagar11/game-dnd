// Игровое состояние: сетка, токены на карте, текущий сценарий, кампания.
// Боевая система вынесена в useGameCombat.js.
// Предметы/контейнеры — в useGameLoot.js.
// Шаблоны токенов (CRUD) — в stores/tokens.js.
// Константы — в constants/systemTokens.js.
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SYSTEM_TOKENS } from '../constants/systemTokens'
import { DEFAULT_AP, DEFAULT_MP } from '../constants/combat'
import { useTokensStore } from './tokens'
import { mapServerToken } from '../utils/mapServerToken'
import { calcMaxHp, getEffectiveStats } from '../utils/combatFormulas'
import { createEmptyInventory } from '../utils/inventoryState'
import { getNpcAttitude } from '../utils/tokenFilters'
import { useGameCombat } from './useGameCombat'
import { useGameLoot } from './useGameLoot'

// Re-export для обратной совместимости (GameMenuSystem.vue)
export { SYSTEM_TOKENS }

export const useGameStore = defineStore('game', () => {
  // ─── Сетка ───────────────────────────────────────────────────────────────────
  const cellSize = ref(60)
  const halfCell = computed(() => cellSize.value / 2)
  const colorGrid = ref('rgba(0,0,0,0.3)')
  const cellSizePx = computed(() => `${cellSize.value}px`)
  // Смещение сетки (наследуется из Map → Scenario)
  const gridOffsetX = ref(0)
  const gridOffsetY = ref(0)
  // Нормализованный offset в [0, cellSize) для рисования / позиционирования
  const gridNormOX = computed(() => {
    const cs = cellSize.value
    return ((gridOffsetX.value % cs) + cs) % cs
  })
  const gridNormOY = computed(() => {
    const cs = cellSize.value
    return ((gridOffsetY.value % cs) + cs) % cs
  })

  function setCellSize(size) {
    cellSize.value = size
  }
  function setColorGrid(color) {
    colorGrid.value = color
  }
  function setGridOffset(x, y) {
    gridOffsetX.value = x
    gridOffsetY.value = y
  }

  // ─── Токены на карте ──────────────────────────────────────────────────────────
  const placedTokens = ref([])
  const selectedPlacedUid = ref(null)
  const shakingTokenUid = ref(null)

  // ─── Стены ────────────────────────────────────────────────────────────────────
  // Массив { col, row } — клетки, отмеченные как стена.
  // wallMode: true — включён режим рисования стен (задаётся редактором).
  const walls = ref([])
  const wallMode = ref(false)

  // Фантомный путь при ховере: массив { col, row } клеток маршрута.
  // Устанавливается из GameRangeOverlay при mousemove, очищается при mouseleave.
  const hoveredPath = ref([])
  function setHoveredPath(path) {
    hoveredPath.value = path ?? []
  }

  // Текущая клетка под курсором (жёлтая подсветка)
  const hoveredCell = ref(null) // { col, row } | null
  function setHoveredCell(cell) {
    hoveredCell.value = cell ?? null
  }

  // Превью при перетаскивании токена — зона дропа (2×2 или 1×2 sub-cells)
  const dropPreviewCell = ref(null) // { col, row, halfSize?, quarterSize? } | null
  function setDropPreviewCell(cell) {
    dropPreviewCell.value = cell ?? null
  }

  // ─── Боевой режим (composable) ────────────────────────────────────────────────
  const combat = useGameCombat(placedTokens, selectedPlacedUid)

  // Проверяет, есть ли стена в клетке (col, row). Используется в useGridDraw.
  function hasWall(col, row) {
    return walls.value.some((w) => w.col === col && w.row === row)
  }

  // Ставит стену в клетку, если её ещё нет
  function addWall(col, row) {
    if (!hasWall(col, row)) walls.value.push({ col, row })
  }

  // Убирает стену из клетки
  function removeWall(col, row) {
    const idx = walls.value.findIndex((w) => w.col === col && w.row === row)
    if (idx !== -1) walls.value.splice(idx, 1)
  }

  // ─── Туман войны ──────────────────────────────────────────────────────────
  // true — туман виден, false — админ его скрыл (игроки всегда видят туман).
  const fogEnabled = ref(true)

  // ─── Способности ──────────────────────────────────────────────────────────
  // Выбранная способность, ожидающая выбора цели/зоны на карте.
  // { name, icon, apCost, areaType, areaSize, slotIndex, tokenUid } | null
  const pendingAbility = ref(null)

  // Превью зоны AoE-способности при ховере — массив { col, row }
  const abilityPreviewCells = ref([])

  // Активная анимация удара (impact) — { cells: [{col,row}], color, icon } | null
  const abilityImpact = ref(null)

  // Активный летящий снаряд — { fromX, fromY, toX, toY, color, icon } | null
  const abilityProjectile = ref(null)

  // SVG-дуга удара мечом — { col, row, color } | null
  const meleeSlash = ref(null)

  // ─── Сессия ───────────────────────────────────────────────────────────────────
  const currentScenario = ref(null)
  const activeCampaign = ref(null)

  function setActiveCampaign(campaign) {
    activeCampaign.value = campaign ?? null
  }

  // ─── Выбор токена на карте ────────────────────────────────────────────────────
  function selectPlacedToken(uid) {
    selectedPlacedUid.value = selectedPlacedUid.value === uid ? null : uid
  }

  // Анимация тряски — запускается когда дверь не настроена перед сохранением
  function shakeToken(uid) {
    shakingTokenUid.value = uid
    setTimeout(() => {
      if (shakingTokenUid.value === uid) shakingTokenUid.value = null
    }, 700)
  }

  // ─── Размещение токенов ───────────────────────────────────────────────────────
  // Делаем snapshot шаблона — экземпляр на карте независим от изменений шаблона
  function placeToken(tokenId, col, row) {
    const tokensStore = useTokensStore()
    const def = tokensStore.tokens.find((t) => t.id === tokenId)
    const uid = crypto.randomUUID()
    const str = def?.strength ?? 0
    const agi = def?.agility ?? 0
    const es = getEffectiveStats(def)
    const mhp = calcMaxHp(es.strength, es.agility)
    placedTokens.value.push({
      uid,
      tokenId,
      col,
      row,
      name: def?.name ?? '',
      npcName: def?.npcName ?? '',
      personality: def?.personality ?? '',
      src: def?.src ?? '',
      tokenType: def?.tokenType ?? 'npc',
      attitude: getNpcAttitude(def?.attitude),
      strength: str,
      agility: agi,
      intellect: def?.intellect ?? 0,
      charisma: def?.charisma ?? 0,
      maxHp: mhp,
      hp: mhp,
      actionPoints: DEFAULT_AP,
      movementPoints: DEFAULT_MP,
      xp: def?.xp ?? 0,
      level: def?.level ?? 1,
      statPoints: 0,
      autoLevel: def?.tokenType === 'npc',
      race: def?.race ?? '',
      armed: false,
      contextNotes: def?.contextNotes ?? '',
      secretKnowledge: def?.secretKnowledge ?? '',
      dispositionType: def?.dispositionType ?? 'neutral',
      inventory: createEmptyInventory(),
    })
    return uid
  }

  function placeSystemToken(systemTokenId, col, row) {
    const def = SYSTEM_TOKENS.find((t) => t.id === systemTokenId)
    if (!def) return null
    const uid = crypto.randomUUID()
    placedTokens.value.push({
      uid,
      tokenId: null,
      systemToken: systemTokenId,
      targetScenarioId: null,
      col,
      row,
      hidden: false,
      name: def.name,
      src: def.src,
      srcOpened: def.srcOpened ?? null,
      opened: false,
      halfSize: def.halfSize ?? false,
      quarterSize: def.quarterSize ?? false,
      strength: 0,
      agility: 0,
      intellect: 0,
      charisma: 0,
      maxHp: 10,
      hp: 10,
      actionPoints: DEFAULT_AP,
      movementPoints: DEFAULT_MP,
    })
    return uid
  }

  function removeToken(uid) {
    const idx = placedTokens.value.findIndex((t) => t.uid === uid)
    if (idx !== -1) {
      placedTokens.value.splice(idx, 1)
      if (selectedPlacedUid.value === uid) selectedPlacedUid.value = null
    }
  }

  function moveToken(uid, col, row) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) {
      token.col = col
      token.row = row
    }
  }

  // Тратит очки действия (AP). cost — сколько AP списать (по умолчанию 1).
  function spendActionPoint(uid, cost = 1) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (!token || token.actionPoints < cost) return false
    token.actionPoints -= cost
    return true
  }

  // Тратит 1 очко передвижения (MP). Для ходьбы по клеткам.
  function spendMovementPoint(uid) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (!token || !(token.movementPoints > 0)) return false
    token.movementPoints -= 1
    return true
  }

  function editPlacedToken(uid, fields) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) Object.assign(token, fields)
  }

  function setDoorTarget(uid, targetScenarioId) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) token.targetScenarioId = targetScenarioId || null
  }

  function setDoorGlobalMapExit(uid, isGlobal) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (!token) return
    token.globalMapExit = Boolean(isGlobal)
    if (isGlobal) token.targetScenarioId = null
  }

  /** Удаляет все размещённые экземпляры шаблона (при удалении шаблона из библиотеки). */
  function removeTokensByTemplateId(tokenId) {
    placedTokens.value = placedTokens.value.filter((t) => t.tokenId !== tokenId)
  }

  // ─── Лут и контейнеры (composable) ────────────────────────────────────────────
  const loot = useGameLoot(placedTokens, { placeSystemToken, removeToken })

  // ─── Инициализация из сервера ─────────────────────────────────────────────────
  function initPlacedTokens(serverTokens) {
    const tokensStore = useTokensStore()
    placedTokens.value = serverTokens.map((t) => mapServerToken(t, tokensStore.tokens))
    selectedPlacedUid.value = null
  }

  // ─── Инициализация стен из сервера ───────────────────────────────────────────
  function initWalls(serverWalls) {
    walls.value = (serverWalls ?? []).map(({ col, row }) => ({ col, row }))
  }

  return {
    // Сетка
    cellSize,
    halfCell,
    colorGrid,
    cellSizePx,
    gridOffsetX,
    gridOffsetY,
    gridNormOX,
    gridNormOY,
    setCellSize,
    setColorGrid,
    setGridOffset,
    // Токены на карте
    placedTokens,
    selectedPlacedUid,
    shakingTokenUid,
    selectPlacedToken,
    shakeToken,
    placeToken,
    placeSystemToken,
    removeToken,
    removeTokensByTemplateId,
    moveToken,
    editPlacedToken,
    spendActionPoint,
    spendMovementPoint,
    // Двери
    setDoorTarget,
    setDoorGlobalMapExit,
    // Стены
    walls,
    wallMode,
    hasWall,
    addWall,
    removeWall,
    // UI
    hoveredPath,
    setHoveredPath,
    hoveredCell,
    setHoveredCell,
    dropPreviewCell,
    setDropPreviewCell,
    // Туман
    fogEnabled,
    // Способности
    pendingAbility,
    abilityPreviewCells,
    abilityImpact,
    abilityProjectile,
    meleeSlash,
    // Сессия
    currentScenario,
    activeCampaign,
    setActiveCampaign,
    // Утилиты
    calcMaxHp,
    // Инициализация
    initPlacedTokens,
    initWalls,
    // Боевая система (из useGameCombat)
    ...combat,
    // Лут и контейнеры (из useGameLoot)
    ...loot,
  }
})

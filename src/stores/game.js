// Игровое состояние: сетка, токены на карте, текущий сценарий, кампания.
// Шаблоны токенов (CRUD) вынесены в stores/tokens.js.
// Константы — в constants/systemTokens.js.
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SYSTEM_TOKENS } from '../constants/systemTokens'
import { useTokensStore } from './tokens'
import { mapServerToken } from '../utils/mapServerToken'
import { calcMaxHp } from '../utils/combatFormulas'

// Re-export для обратной совместимости (GameMenuSystem.vue)
export { SYSTEM_TOKENS }

export const useGameStore = defineStore('game', () => {
  // ─── Сетка ───────────────────────────────────────────────────────────────────
  const cellSize = ref(60)
  const colorGrid = ref('rgba(0,0,0,0.3)')
  const cellSizePx = computed(() => `${cellSize.value}px`)

  function setCellSize(size) {
    cellSize.value = size
  }
  function setColorGrid(color) {
    colorGrid.value = color
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

  // Пара токенов в боевом контакте — показывает значок мечей между ними
  // { heroUid: string, npcUid: string, npcInitiated: boolean } | null
  const combatPair = ref(null)
  function setCombatPair(heroUid, npcUid, npcInitiated = false) {
    combatPair.value = heroUid && npcUid ? { heroUid, npcUid, npcInitiated } : null
  }

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

  // ─── Боевой режим / инициатива ────────────────────────────────────────────────
  // Радиус видимости: враг считается «видимым», если находится в пределах
  // VISIBILITY_RADIUS клеток от любого героя (расстояние по Евклиду).
  const VISIBILITY_RADIUS = 6

  const combatMode = ref(false)
  // Массив { uid, initiative, name, src, tokenType, attitude } — отсортирован по убыванию инициативы.
  const initiativeOrder = ref([])
  const currentInitiativeIndex = ref(0) // индекс текущего участника в initiativeOrder
  const combatRound = ref(0) // номер текущего раунда боя
  // uid → кол-во раундов, в которые враг был вне зоны видимости.
  const enemyHiddenTurns = ref({})

  /** Проверяет, находится ли токен в зоне видимости хотя бы одного героя */
  function isTokenVisible(token) {
    const heroes = placedTokens.value.filter((t) => t.tokenType === 'hero')
    return heroes.some((hero) => {
      const dc = Math.abs(hero.col - token.col)
      const dr = Math.abs(hero.row - token.row)
      return Math.sqrt(dc * dc + dr * dr) <= VISIBILITY_RADIUS
    })
  }

  /** Бросок d20 инициативы для всех не-системных токенов, сортировка по убыванию */
  function rollInitiativeAll(excludeUid = null, visibleKeys = null) {
    return placedTokens.value
      .filter((t) => {
        if (t.systemToken || t.uid === excludeUid) return false
        // Если передана карта видимости — включаем только видимых токенов
        if (visibleKeys && !visibleKeys.has(`${t.col}:${t.row}`)) return false
        return true
      })
      .map((t) => ({
        uid: t.uid,
        initiative: Math.floor(Math.random() * 20) + 1,
        name: t.name,
        src: t.src,
        tokenType: t.tokenType ?? 'npc',
        attitude: t.attitude ?? 'neutral',
      }))
      .sort((a, b) => b.initiative - a.initiative)
  }

  /**
   * Войти в боевой режим.
   * @param {string|null} firstUid — uid токена, который начал бой (встаёт ПОСЛЕДНИМ в инициативу).
   * @param {Set<string>|null} visibleKeys — Set «col:row» видимых клеток; если null — все токены.
   */
  function enterCombat(firstUid = null, visibleKeys = null) {
    if (combatMode.value) return
    // Остальные токены разыгрывают порядок по d20; firstUid в жеребьёвке не участвует
    const order = rollInitiativeAll(firstUid, visibleKeys)
    if (firstUid) {
      const t = placedTokens.value.find((e) => e.uid === firstUid)
      if (t) {
        order.push({
          uid: t.uid,
          initiative: 0, // гарантированно последний
          name: t.name,
          src: t.src,
          tokenType: t.tokenType ?? 'npc',
          attitude: t.attitude ?? 'neutral',
        })
      }
    }
    initiativeOrder.value = order
    currentInitiativeIndex.value = 0
    combatRound.value = 1
    enemyHiddenTurns.value = {}
    combatMode.value = true
  }

  /** Выйти из боевого режима — все враги убиты или сбежали */
  function exitCombat() {
    combatMode.value = false
    initiativeOrder.value = []
    currentInitiativeIndex.value = 0
    combatRound.value = 0
    enemyHiddenTurns.value = {}
    // Восстановить AP всем токенам
    for (const t of placedTokens.value) {
      t.actionPoints = 4
    }
  }

  /** Проверка условия конца боя: нет живых видимых врагов */
  function checkCombatEnd() {
    const hostiles = placedTokens.value.filter(
      (t) => t.tokenType === 'npc' && t.attitude === 'hostile'
    )
    if (!hostiles.length) {
      exitCombat()
      return
    }
    const allFled = hostiles.every((t) => (enemyHiddenTurns.value[t.uid] ?? 0) >= 3)
    if (allFled) exitCombat()
  }

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
    const mhp = calcMaxHp(str, agi)
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
      attitude: def?.attitude ?? 'neutral',
      strength: str,
      agility: agi,
      intellect: def?.intellect ?? 0,
      charisma: def?.charisma ?? 0,
      maxHp: mhp,
      hp: mhp,
      actionPoints: 4,
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
      strength: 0,
      agility: 0,
      intellect: 0,
      charisma: 0,
      maxHp: 10,
      hp: 10,
      actionPoints: 4,
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

  // Тратит 1 очко действия. Возвращает false если AP = 0 (нельзя ходить).
  function spendActionPoint(uid) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (!token || !(token.actionPoints > 0)) return false
    token.actionPoints -= 1
    return true
  }

  // Завершить ход.
  // Мирный режим → восстановить AP всем.
  // Боевой режим → передать ход следующему по инициативе;
  //   при начале нового раунда — проверить видимость врагов и условие выхода из боя.
  function endTurn() {
    if (!combatMode.value) {
      for (const t of placedTokens.value) {
        t.actionPoints = 4
      }
      return
    }

    // ── Боевой режим ──────────────────────────────────────────────────────────
    const order = initiativeOrder.value
    if (!order.length) return

    // Забрать AP у текущего участника
    const currUid = order[currentInitiativeIndex.value]?.uid
    const currToken = placedTokens.value.find((t) => t.uid === currUid)
    if (currToken) currToken.actionPoints = 0

    // Перейти к следующему
    const prevIndex = currentInitiativeIndex.value
    const nextIndex = prevIndex + 1
    const isNewRound = nextIndex >= order.length
    currentInitiativeIndex.value = isNewRound ? 0 : nextIndex

    if (isNewRound) {
      combatRound.value++

      // Обновить счётчики скрытых ходов для враждебных токенов
      const hostiles = placedTokens.value.filter(
        (t) => t.tokenType === 'npc' && t.attitude === 'hostile'
      )
      for (const t of hostiles) {
        if (isTokenVisible(t)) {
          enemyHiddenTurns.value[t.uid] = 0
        } else {
          enemyHiddenTurns.value[t.uid] = (enemyHiddenTurns.value[t.uid] ?? 0) + 1
        }
      }

      // Убрать сбежавших (> 3 раундов вне видимости) из порядка инициативы
      const fledUids = new Set(
        hostiles.filter((t) => (enemyHiddenTurns.value[t.uid] ?? 0) >= 3).map((t) => t.uid)
      )
      if (fledUids.size) {
        initiativeOrder.value = initiativeOrder.value.filter((e) => !fledUids.has(e.uid))
        if (currentInitiativeIndex.value >= initiativeOrder.value.length) {
          currentInitiativeIndex.value = 0
        }
      }

      checkCombatEnd()
      if (!combatMode.value) return // Бой завершён — exitCombat уже восстановил AP
    }

    // Восстановить AP следующему участнику и выбрать его
    const nextUid = initiativeOrder.value[currentInitiativeIndex.value]?.uid
    const nextToken = placedTokens.value.find((t) => t.uid === nextUid)
    if (nextToken) {
      nextToken.actionPoints = 4
      selectedPlacedUid.value = nextUid
    }
  }

  function editPlacedToken(uid, fields) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) Object.assign(token, fields)
  }

  function setDoorTarget(uid, targetScenarioId) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) token.targetScenarioId = targetScenarioId || null
  }

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
    cellSize,
    colorGrid,
    cellSizePx,
    placedTokens,
    selectedPlacedUid,
    shakingTokenUid,
    walls,
    wallMode,
    combatPair,
    fogEnabled,
    currentScenario,
    activeCampaign,
    setCellSize,
    setColorGrid,
    setActiveCampaign,
    selectPlacedToken,
    shakeToken,
    placeToken,
    placeSystemToken,
    removeToken,
    moveToken,
    editPlacedToken,
    calcMaxHp,
    spendActionPoint,
    endTurn,
    setCombatPair,
    hoveredPath,
    setHoveredPath,
    hoveredCell,
    setHoveredCell,
    setDoorTarget,
    initPlacedTokens,
    initWalls,
    hasWall,
    addWall,
    removeWall,
    // Боевой режим
    combatMode,
    initiativeOrder,
    currentInitiativeIndex,
    combatRound,
    enemyHiddenTurns,
    enterCombat,
    exitCombat,
    isTokenVisible,
  }
})

// Игровое состояние: сетка, токены на карте, текущий сценарий, кампания.
// Шаблоны токенов (CRUD) вынесены в stores/tokens.js.
// Константы — в constants/systemTokens.js.
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SYSTEM_TOKENS } from '../constants/systemTokens'
import { useTokensStore } from './tokens'

// Re-export для обратной совместимости (GameMenuSystem.vue)
export { SYSTEM_TOKENS }

// Базовый URL API — используется как запасной источник для src, если токен
// не найден в tokensStore (например, при первом рендере или удалённом токене).
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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
    placedTokens.value.push({
      uid,
      tokenId,
      col,
      row,
      name: def?.name ?? '',
      src: def?.src ?? '',
      strength: def?.strength ?? 0,
      agility: def?.agility ?? 0,
      intellect: def?.intellect ?? 0,
      charisma: def?.charisma ?? 0,
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

  function editPlacedToken(uid, fields) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) Object.assign(token, fields)
  }

  function setDoorTarget(uid, targetScenarioId) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) token.targetScenarioId = targetScenarioId || null
  }

  // ─── Инициализация из сервера ─────────────────────────────────────────────────
  // После populate() на сервере tokenId приходит объектом { _id, ... }, а не строкой.
  function initPlacedTokens(serverTokens) {
    const tokensStore = useTokensStore()
    placedTokens.value = serverTokens.map((serverToken) => {
      const { uid, tokenId, systemToken, col, row, hidden } = serverToken
      if (systemToken) {
        const def = SYSTEM_TOKENS.find((t) => t.id === systemToken)
        return {
          uid,
          tokenId: null,
          systemToken,
          targetScenarioId: serverToken.targetScenarioId
            ? String(serverToken.targetScenarioId)
            : null,
          col,
          row,
          hidden: hidden ?? false,
          name: def?.name ?? systemToken,
          src: def?.src ?? '',
          strength: 0,
          agility: 0,
          intellect: 0,
          charisma: 0,
        }
      }
      const id = tokenId && typeof tokenId === 'object' ? String(tokenId._id) : String(tokenId)
      const def = tokensStore.tokens.find((t) => t.id === id)

      // Запасной источник src: populated tokenId содержит imagePath, если сервер
      // вернул полные данные через populate() (GET /api/scenarios/:id).
      // Это защищает от ситуации, когда tokensStore ещё не загружен или токен удалён.
      const tokenObj = tokenId && typeof tokenId === 'object' ? tokenId : null
      const fallbackSrc = tokenObj?.imagePath ? `${API}/${tokenObj.imagePath}` : ''

      return {
        uid,
        tokenId: id,
        col,
        row,
        hidden: hidden ?? false,
        name: def?.name ?? tokenObj?.name ?? 'Неизвестный',
        src: def?.src ?? fallbackSrc,
        strength: def?.strength ?? tokenObj?.stats?.strength ?? 0,
        agility: def?.agility ?? tokenObj?.stats?.agility ?? 0,
        intellect: def?.intellect ?? tokenObj?.stats?.intellect ?? 0,
        charisma: def?.charisma ?? tokenObj?.stats?.charisma ?? 0,
      }
    })
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
    setDoorTarget,
    initPlacedTokens,
    initWalls,
    hasWall,
    addWall,
    removeWall,
  }
})

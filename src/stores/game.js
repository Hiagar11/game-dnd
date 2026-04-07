// Игровое состояние: сетка, токены на карте, текущий сценарий, кампания.
// Шаблоны токенов (CRUD) вынесены в stores/tokens.js.
// Константы — в constants/systemTokens.js.
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SYSTEM_TOKENS } from '../constants/systemTokens'
import { useTokensStore } from './tokens'

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
    placedTokens.value.push({
      uid: crypto.randomUUID(),
      tokenId,
      col,
      row,
      name: def?.name ?? '',
      src: def?.src ?? '',
      meleeDmg: def?.meleeDmg ?? 0,
      rangedDmg: def?.rangedDmg ?? 0,
      visionRange: def?.visionRange ?? 0,
      defense: def?.defense ?? 0,
      evasion: def?.evasion ?? 0,
    })
  }

  function placeSystemToken(systemTokenId, col, row) {
    const def = SYSTEM_TOKENS.find((t) => t.id === systemTokenId)
    if (!def) return
    placedTokens.value.push({
      uid: crypto.randomUUID(),
      tokenId: null,
      systemToken: systemTokenId,
      targetScenarioId: null,
      col,
      row,
      hidden: false,
      name: def.name,
      src: def.src,
      meleeDmg: 0,
      rangedDmg: 0,
      visionRange: 0,
      defense: 0,
      evasion: 0,
    })
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
          meleeDmg: 0,
          rangedDmg: 0,
          visionRange: 0,
          defense: 0,
          evasion: 0,
        }
      }
      const id = tokenId && typeof tokenId === 'object' ? String(tokenId._id) : String(tokenId)
      const def = tokensStore.tokens.find((t) => t.id === id)
      return {
        uid,
        tokenId: id,
        col,
        row,
        hidden: hidden ?? false,
        name: def?.name ?? 'Неизвестный',
        src: def?.src ?? '',
        meleeDmg: def?.meleeDmg ?? 0,
        rangedDmg: def?.rangedDmg ?? 0,
        visionRange: def?.visionRange ?? 6,
        defense: def?.defense ?? 0,
        evasion: def?.evasion ?? 0,
      }
    })
    selectedPlacedUid.value = null
  }

  return {
    cellSize,
    colorGrid,
    cellSizePx,
    placedTokens,
    selectedPlacedUid,
    shakingTokenUid,
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
  }
})

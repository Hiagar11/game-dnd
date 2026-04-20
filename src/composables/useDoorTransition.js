export function useDoorTransition({
  scenariosStore,
  gameStore,
  selectScenario,
  viewRef,
  offsetX,
  offsetY,
  onGlobalMapExit,
}) {
  async function onDoorTransition({
    targetScenarioId,
    globalMapExit,
    sourceScenarioId,
    buffer,
    initiatorUid,
  }) {
    // Выход на глобальную карту — вызываем внешний колбэк
    if (globalMapExit) {
      onGlobalMapExit?.({ sourceScenarioId, buffer, initiatorUid })
      return
    }

    const target = scenariosStore.scenarios.find((s) => String(s.id) === String(targetScenarioId))
    if (!target) return

    await selectScenario(target)

    const backDoor = gameStore.placedTokens.find(
      (t) => t.systemToken === 'door' && String(t.targetScenarioId) === String(sourceScenarioId)
    )
    if (!backDoor) return

    centerOnToken(backDoor)
    if (!buffer?.length) return

    const newInitiatorUid = placeBufferAroundDoor(backDoor, buffer, initiatorUid)
    if (newInitiatorUid) gameStore.selectPlacedToken(newInitiatorUid)
  }

  /**
   * Проверяет, можно ли разместить 2×2 токен с top-left в (col, row).
   * Все 4 sub-клетки не должны быть стеной и не должны пересекаться
   * с уже занятыми 2×2 позициями (expandOccupied).
   */
  function canPlace2x2(col, row, wallSet, blockedSet) {
    for (let dc = 0; dc < 2; dc++) {
      for (let dr = 0; dr < 2; dr++) {
        if (wallSet.has(`${col + dc},${row + dr}`)) return false
      }
    }
    return !blockedSet.has(`${col},${row}`)
  }

  /**
   * Добавляет 2×2 позицию в blocked-set: блокирует все top-left
   * координаты, пересекающиеся с данным блоком.
   * Два 2×2 блока пересекаются если |c1-c2| < 2 && |r1-r2| < 2.
   */
  function markOccupied2x2(col, row, blockedSet) {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        blockedSet.add(`${col + dc},${row + dr}`)
      }
    }
  }

  function placeBufferAroundDoor(door, buffer, initiatorUid = null) {
    // Удаляем дубликаты (токены с тем же tokenId уже на карте)
    const bufferTokenIds = new Set(buffer.map((bt) => bt.tokenId).filter(Boolean))
    for (let i = gameStore.placedTokens.length - 1; i >= 0; i--) {
      const token = gameStore.placedTokens[i]
      if (!token.systemToken && token.tokenId && bufferTokenIds.has(token.tokenId)) {
        gameStore.placedTokens.splice(i, 1)
      }
    }

    // Стены — set sub-cell ключей
    const wallSet = new Set(gameStore.walls.map((w) => `${w.col},${w.row}`))

    // Blocked-set для 2×2 коллизий: позиции всех существующих токенов
    const blockedSet = new Set()
    for (const t of gameStore.placedTokens) {
      markOccupied2x2(t.col, t.row, blockedSet)
    }

    // BFS от двери: шагаем по 2 sub-cell (= 1 полная клетка),
    // чтобы 2×2 токены не накладывались друг на друга
    const freeQueue = []
    const visited = new Set()
    visited.add(`${door.col},${door.row}`)

    const pendingSearch = [{ col: door.col, row: door.row }]
    const STEP = 2 // шаг = 1 полная клетка (2 sub-cells)

    let searchIdx = 0
    while (freeQueue.length < buffer.length && searchIdx < pendingSearch.length) {
      const { col, row } = pendingSearch[searchIdx++]

      // 4 кардинальных направления с шагом 2
      for (const [dc, dr] of [
        [-STEP, 0],
        [STEP, 0],
        [0, -STEP],
        [0, STEP],
      ]) {
        const nc = col + dc
        const nr = row + dr
        const key = `${nc},${nr}`
        if (visited.has(key)) continue
        visited.add(key)

        pendingSearch.push({ col: nc, row: nr })

        if (nc >= 0 && nr >= 0 && canPlace2x2(nc, nr, wallSet, blockedSet)) {
          freeQueue.push({ col: nc, row: nr })
          markOccupied2x2(nc, nr, blockedSet)
        }
      }
    }

    let initiatorNewUid = null
    buffer.forEach((token, i) => {
      const cell = freeQueue[i]
      if (!cell) return
      const newUid = crypto.randomUUID()
      if (token.uid === initiatorUid) initiatorNewUid = newUid
      gameStore.placedTokens.push({
        ...token,
        uid: newUid,
        col: cell.col,
        row: cell.row,
      })
    })
    return initiatorNewUid
  }

  function centerOnToken(placed) {
    const hc = gameStore.halfCell
    const tokenX = placed.col * hc + gameStore.gridNormOX + hc
    const tokenY = placed.row * hc + gameStore.gridNormOY + hc
    const viewW = viewRef.value?.offsetWidth ?? window.innerWidth
    const viewH = viewRef.value?.offsetHeight ?? window.innerHeight
    offsetX.value = viewW / 2 - tokenX
    offsetY.value = viewH / 2 - tokenY
  }

  return {
    onDoorTransition,
    placeBufferAroundDoor,
    centerOnToken,
  }
}

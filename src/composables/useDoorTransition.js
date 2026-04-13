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

  function placeBufferAroundDoor(door, buffer, initiatorUid = null) {
    const bufferTokenIds = new Set(buffer.map((bt) => bt.tokenId).filter(Boolean))
    for (let i = gameStore.placedTokens.length - 1; i >= 0; i--) {
      const token = gameStore.placedTokens[i]
      if (!token.systemToken && token.tokenId && bufferTokenIds.has(token.tokenId)) {
        gameStore.placedTokens.splice(i, 1)
      }
    }

    const occupiedKeys = new Set(gameStore.placedTokens.map((t) => `${t.col},${t.row}`))
    const wallKeys = new Set(gameStore.walls.map((w) => `${w.col},${w.row}`))

    const freeQueue = []
    const visited = new Set([`${door.col},${door.row}`])
    const pendingSearch = [{ col: door.col, row: door.row }]

    let searchIdx = 0
    while (freeQueue.length < buffer.length && searchIdx < pendingSearch.length) {
      const { col, row } = pendingSearch[searchIdx++]
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue
          const nc = col + dc
          const nr = row + dr
          const key = `${nc},${nr}`
          if (visited.has(key)) continue
          visited.add(key)
          if (!wallKeys.has(key) && !occupiedKeys.has(key)) {
            freeQueue.push({ col: nc, row: nr })
            occupiedKeys.add(key)
          } else {
            pendingSearch.push({ col: nc, row: nr })
          }
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
  }
}

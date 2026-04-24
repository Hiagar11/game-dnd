import { getNpcAttitude, getSelectedToken } from '../utils/tokenFilters'
import { TOKEN_MOVE_STEP_DELAY_MS } from '../constants/timing'
import { sleep } from '../utils/async'
import { getCurrentScenarioId } from '../utils/scenario'
import { ADJACENT_2x2, expandOccupied2x2 } from './useTokenMove'
import { getItemPrice, applyAttitudeDiscount } from '../utils/itemPrice'
import { splitCoins } from '../utils/inventoryState'

export function useTokenDialogInteraction({
  store,
  getSocket,
  closeContextMenu,
  findPath,
  openBubble,
  closeBubble,
  addNpcMessage,
  addDiceRollMessage,
  addPlayerMessage,
  addTradeOffer,
  addWarningMessage,
  triggerAttitudeArrow,
  dialogBubbles,
  getVisibleKeys,
}) {
  function emitNpcEvent(npcUid, text) {
    const scenarioId = getCurrentScenarioId(store)
    if (!scenarioId) return
    getSocket()?.emit('npc:event', { scenarioId, uid: npcUid, text })
  }
  async function onTalkClick(npc) {
    const hero = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    if (!hero) return

    const heroUid = hero.uid
    const heroSrc = hero.src ?? null

    const alreadyAdjacent = ADJACENT_2x2.some(
      ([dc, dr]) => npc.col + dc === hero.col && npc.row + dr === hero.row
    )

    store.selectPlacedToken(null)
    closeContextMenu()

    if (!alreadyAdjacent) {
      // Исключаем героя и NPC-цель из occupied — expandOccupied2x2 расширяет
      // каждую позицию на ±1, и без исключения NPC блокируются все соседние клетки
      const occupied = new Set(
        store.placedTokens
          .filter((t) => t.uid !== heroUid && t.uid !== npc.uid)
          .map((t) => `${t.col},${t.row}`)
      )
      const wallSet = new Set(store.walls.map((w) => `${w.col},${w.row}`))

      // expandOccupied2x2 расширяет каждую occupied-позицию на ±1 —
      // именно так findPath блокирует клетки. Фильтруем dest через тот же набор,
      // чтобы не выбрать клетку, до которой findPath не доберётся.
      const blocked = expandOccupied2x2(occupied)

      // Ближайшая свободная клетка рядом с НПС — смещения для 2×2 токенов
      const dest = ADJACENT_2x2.map(([dc, dr]) => ({ col: npc.col + dc, row: npc.row + dr }))
        .filter((cell) => {
          const key = `${cell.col},${cell.row}`
          return cell.col >= 0 && cell.row >= 0 && !blocked.has(key) && !wallSet.has(key)
        })
        .reduce((best, cell) => {
          if (!best) return cell
          const d = Math.abs(cell.col - hero.col) + Math.abs(cell.row - hero.row)
          const bd = Math.abs(best.col - hero.col) + Math.abs(best.row - hero.row)
          return d < bd ? cell : best
        }, null)

      if (!dest) return // НПС полностью окружён другими токенами

      // Строим полный путь без ограничения AP — подход к НПС бесплатный (как к двери)
      const path = findPath(hero, dest, store.walls, 999, occupied)
      if (!path || path.length === 0) return // путь заблокирован стенами

      const scenarioId = getCurrentScenarioId(store)

      for (const step of path) {
        store.moveToken(heroUid, step.col, step.row)
        if (scenarioId) {
          getSocket()?.emit('token:move', {
            scenarioId,
            uid: heroUid,
            col: step.col,
            row: step.row,
          })
        }
        await sleep(TOKEN_MOVE_STEP_DELAY_MS)
      }
    }

    // Диалог открываем только если теперь стоим рядом с НПС
    const arrivedHero = store.placedTokens.find((t) => t.uid === heroUid)
    if (!arrivedHero) return

    const nowAdjacent = ADJACENT_2x2.some(
      ([dc, dr]) => npc.col + dc === arrivedHero.col && npc.row + dr === arrivedHero.row
    )
    if (!nowAdjacent) return

    openBubble(npc.uid, heroSrc, heroUid)
    emitNpcTalk(npc, 'Привет!')
  }

  function getHeroPersuasion(npcUid) {
    const bubble = dialogBubbles.value?.get(npcUid)
    const heroUid = bubble?.heroUid
    if (!heroUid) return 0
    const hero = store.placedTokens.find((t) => t.uid === heroUid)
    if (!hero) return 0
    const c = hero.charisma ?? 0
    const i = hero.intellect ?? 0
    return Math.floor((c * 2 + i) / 3)
  }

  function getHeroLuck(npcUid) {
    const bubble = dialogBubbles.value?.get(npcUid)
    const heroUid = bubble?.heroUid
    if (!heroUid) return 0
    const hero = store.placedTokens.find((t) => t.uid === heroUid)
    if (!hero) return 0
    const c = hero.charisma ?? 0
    const a = hero.agility ?? 0
    return Math.floor((c * 2 + a) / 4)
  }

  function getHeroDeception(npcUid) {
    const bubble = dialogBubbles.value?.get(npcUid)
    const heroUid = bubble?.heroUid
    if (!heroUid) return 0
    const hero = store.placedTokens.find((t) => t.uid === heroUid)
    if (!hero) return 0
    const c = hero.charisma ?? 0
    const a = hero.agility ?? 0
    const i = hero.intellect ?? 0
    return Math.floor((c * 2 + a + i) / 4)
  }

  function emitNpcTalk(npc, playerMessage) {
    const socket = getSocket()
    if (!socket) return

    const scenarioId = getCurrentScenarioId(store)

    // Собираем список предметов NPC (ключи и т.п.) для AI
    const npcItems = (npc.inventory?.cells ?? []).filter(Boolean).map((item) => item.name)

    socket.emit('npc:talk', {
      npcUid: npc.uid,
      tokenId: npc.tokenId ?? null,
      scenarioId,
      placedAttitude: getNpcAttitude(npc),
      placedName: npc.npcName || npc.name || '',
      playerMessage,
      heroPersuasion: getHeroPersuasion(npc.uid),
      heroDeception: getHeroDeception(npc.uid),
      heroLuck: getHeroLuck(npc.uid),
      npcItems,
      mapContext: store.currentScenario?.mapContext ?? '',
      combatLog: npc.combatLog ?? [],
      captured: !!npc.captured,
    })

    function onReply({
      npcUid,
      text,
      attitudeDelta,
      newScore,
      newAttitude,
      diceRoll,
      action,
      warning,
      initiateCombat,
    }) {
      if (npcUid !== npc.uid) return
      socket.off('npc:reply', onReply)

      if (diceRoll) addDiceRollMessage(npc.uid, diceRoll)
      addNpcMessage(npc.uid, text, newScore)
      if (newAttitude && ['hostile', 'friendly', 'neutral'].includes(newAttitude)) {
        store.editPlacedToken(npc.uid, { attitude: newAttitude })
      }

      // Обработка действия: NPC отдаёт предмет бесплатно
      if (action?.type === 'giveItem' || action?.type === 'giveKey') {
        const liveNpc = store.placedTokens.find((t) => t.uid === npc.uid)
        if (liveNpc?.inventory?.cells) {
          const wantedName = action.itemName?.toLowerCase()
          const idx = wantedName
            ? liveNpc.inventory.cells.findIndex((c) => c && c.name?.toLowerCase() === wantedName)
            : -1
          const keyIdx =
            idx !== -1 ? idx : liveNpc.inventory.cells.findIndex((c) => c && c.slot === 'key')
          const fallbackIdx =
            keyIdx !== -1 ? keyIdx : liveNpc.inventory.cells.findIndex((c) => c != null)
          if (fallbackIdx !== -1) {
            const item = liveNpc.inventory.cells[fallbackIdx]
            liveNpc.inventory.cells[fallbackIdx] = null
            store.addGroundBag(liveNpc.col, liveNpc.row, item)
            emitNpcEvent(npc.uid, `Отдал предмет «${item.name}» игроку бесплатно`)
          }
        }
      }

      // Обработка торговли: NPC предлагает продать предмет за монеты
      if (action?.type === 'tradeOffer') {
        const liveNpc = store.placedTokens.find((t) => t.uid === npc.uid)
        if (liveNpc?.inventory?.cells) {
          const wantedName = action.itemName?.toLowerCase()
          const itemIdx = wantedName
            ? liveNpc.inventory.cells.findIndex((c) => c && c.name?.toLowerCase() === wantedName)
            : liveNpc.inventory.cells.findIndex((c) => c != null)
          if (itemIdx !== -1) {
            const item = liveNpc.inventory.cells[itemIdx]
            const basePrice = getItemPrice(item)
            const price = applyAttitudeDiscount(basePrice, newScore ?? 0)
            addTradeOffer(npc.uid, {
              itemName: item.name,
              price,
              itemIcon: item.icon ?? null,
              npcUid: npc.uid,
            })
          }
        }
      }

      // Стрелка показывается только когда счёт действительно изменился
      if (attitudeDelta > 0) {
        triggerAttitudeArrow(npc.uid, 'up')
      } else if (attitudeDelta < 0) {
        triggerAttitudeArrow(npc.uid, 'down')
      }

      // Предупреждение: NPC на грани враждебности
      if (warning) {
        addWarningMessage(npc.uid, 'Ещё одна угроза — и он нападёт!')
      }

      // NPC стал враждебным — закрываем диалог и начинаем бой
      if (initiateCombat) {
        setTimeout(() => {
          closeBubble(npc.uid)
          // Только начинаем боевой режим, если он ещё не активен
          if (!store.combatMode) {
            store.enterCombat(npc.uid, getVisibleKeys?.() ?? null)
          }
        }, 2000)
      }
    }

    socket.on('npc:reply', onReply)
  }

  function onDialogSend(uid, playerText) {
    const npc = store.placedTokens.find((t) => t.uid === uid)
    if (!npc) return
    addPlayerMessage(uid, playerText)
    emitNpcTalk(npc, playerText)
  }

  /**
   * Игрок принимает торговое предложение NPC.
   * Проверяет монеты героя, списывает, перемещает предмет.
   * @param {string} npcUid — uid NPC
   * @param {string} itemName — имя предмета
   * @param {number} price — цена в медяках
   * @returns {{ ok: boolean, reason?: string }}
   */
  function onTradeAccept(npcUid, itemName, price) {
    const bubble = dialogBubbles.value?.get(npcUid)
    const heroUid = bubble?.heroUid
    if (!heroUid) return { ok: false, reason: 'no_hero' }

    const hero = store.placedTokens.find((t) => t.uid === heroUid)
    if (!hero) return { ok: false, reason: 'no_hero' }

    const heroCoins = hero.inventory?.coins ?? 0
    if (heroCoins < price) {
      const need = splitCoins(price)
      const has = splitCoins(heroCoins)
      addNpcMessage(
        npcUid,
        `У тебя не хватает монет. Нужно ${formatCoins(need)}, а у тебя ${formatCoins(has)}.`
      )
      return { ok: false, reason: 'not_enough' }
    }

    // Списываем монеты у героя
    store.editPlacedToken(heroUid, {
      inventory: {
        ...hero.inventory,
        coins: heroCoins - price,
      },
    })

    // Ищем и передаём предмет от NPC
    const npc = store.placedTokens.find((t) => t.uid === npcUid)
    if (npc?.inventory?.cells) {
      const wantedName = itemName?.toLowerCase()
      const idx = wantedName
        ? npc.inventory.cells.findIndex((c) => c && c.name?.toLowerCase() === wantedName)
        : -1
      if (idx !== -1) {
        const item = npc.inventory.cells[idx]
        npc.inventory.cells[idx] = null
        store.addGroundBag(npc.col, npc.row, item)

        // Добавляем монеты NPC
        const npcCoins = npc.inventory?.coins ?? 0
        store.editPlacedToken(npcUid, {
          inventory: {
            ...npc.inventory,
            coins: npcCoins + price,
          },
        })
      }
    }

    const paid = splitCoins(price)
    addNpcMessage(npcUid, `Сделка! ${formatCoins(paid)} — удовольствие иметь дело.`)
    emitNpcEvent(npcUid, `Продал предмет «${itemName}» игроку за ${price} медяков`)
    return { ok: true }
  }

  function onTradeDecline(npcUid) {
    addNpcMessage(npcUid, 'Ну как знаешь... Передумаешь — обращайся.')
    emitNpcEvent(npcUid, 'Игрок отказался от торговли')
  }

  return {
    onTalkClick,
    onDialogSend,
    onTradeAccept,
    onTradeDecline,
  }
}

function formatCoins({ gold, silver, copper }) {
  const parts = []
  if (gold) parts.push(`${gold} зол.`)
  if (silver) parts.push(`${silver} сер.`)
  if (copper) parts.push(`${copper} мед.`)
  return parts.join(' ') || '0 мед.'
}

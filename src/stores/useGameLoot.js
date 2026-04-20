// Предметы на земле и контейнеры (сундуки, кувшины, мешки).
// Используется как внутренний composable хранилища game.js.

import { ref } from 'vue'
import { generateItem } from '../utils/lootGenerator'
import { findDropCell } from '../utils/findDropCell'
import { SYSTEM_ITEMS, ITEM_SLOT_LABELS } from '../constants/itemSlots'

const MERGE_RADIUS = 3

/**
 * @param {import('vue').Ref<Array>} placedTokens — реактивный массив токенов на карте
 * @param {Object} deps — зависимости из основного хранилища
 * @param {Function} deps.placeSystemToken — создать системный токен (bag)
 * @param {Function} deps.removeToken — удалить токен по uid
 */
export function useGameLoot(placedTokens, { placeSystemToken, removeToken }) {
  // Массив { id, col, row, items: [item, …] } — кучки лута, лежащие на карте.
  const groundItems = ref([])

  /**
   * Добавить предмет на землю рядом с (col, row).
   * Если в радиусе MERGE_RADIUS суб-клеток уже есть кучка — кладём туда.
   * Иначе создаём новую.
   */
  function addGroundLoot(col, row, item) {
    let nearest = null
    let bestDist = Infinity
    for (const g of groundItems.value) {
      const d = Math.abs(g.col - col) + Math.abs(g.row - row)
      if (d <= MERGE_RADIUS && d < bestDist) {
        bestDist = d
        nearest = g
      }
    }
    if (nearest) {
      nearest.items.push(item)
    } else {
      groundItems.value.push({ id: crypto.randomUUID(), col, row, items: [item] })
    }
  }

  /** Забрать предмет из кучки. Если кучка опустела — удалить. */
  function pickupGroundItem(pileId, itemIdx) {
    const pile = groundItems.value.find((g) => g.id === pileId)
    if (!pile) return null
    const [item] = pile.items.splice(itemIdx, 1)
    if (!pile.items.length) {
      groundItems.value = groundItems.value.filter((g) => g.id !== pileId)
    }
    return item ?? null
  }

  /**
   * Создать мешочек-контейнер на земле рядом с (heroCol, heroRow).
   * Если рядом уже есть bag-токен — просто добавляем к нему.
   */
  function addGroundBag(heroCol, heroRow, item) {
    // Попробовать слить с ближайшим bag-токеном
    for (const t of placedTokens.value) {
      if (t.systemToken !== 'bag') continue
      const d = Math.abs(t.col - heroCol) + Math.abs(t.row - heroRow)
      if (d <= MERGE_RADIUS) {
        if (!t.items) t.items = []
        t.items.push(item)
        return t.uid
      }
    }
    // Найти свободную клетку рядом с героем
    const occupied = placedTokens.value
      .filter((t) => t.col != null)
      .map((t) => ({ col: t.col, row: t.row }))
    const cell = findDropCell(heroCol, heroRow, occupied)
    const uid = placeSystemToken('bag', cell.col, cell.row)
    const placed = placedTokens.value.find((p) => p.uid === uid)
    if (placed) {
      placed.items = [item]
      placed.name = item.name
    }
    return uid
  }

  /** Забрать предмет из мешочка. Если пуст — удалить токен. */
  function pickupBagItem(uid, itemIdx) {
    const placed = placedTokens.value.find((t) => t.uid === uid)
    if (!placed?.items) return null
    const [item] = placed.items.splice(itemIdx, 1)
    if (!placed.items.length) removeToken(uid)
    return item ?? null
  }

  /** Инициализация предметов на земле из сервера. */
  function initGroundItems(serverItems) {
    groundItems.value = (serverItems ?? []).map((g) => ({
      id: g.id ?? crypto.randomUUID(),
      col: g.col,
      row: g.row,
      items: [...(g.items ?? [])],
    }))
  }

  /**
   * Сконфигурировать предмет в контейнере (сундук/кувшин/мешок).
   * Сохраняет шаблон { slot, rarity, isTemplate } — реальный предмет
   * генерируется при открытии контейнера с ilvl = уровень героя.
   */
  function configureItemToken(uid, slot, rarity) {
    const placed = placedTokens.value.find((t) => t.uid === uid)
    if (
      !placed ||
      (placed.systemToken !== 'item' &&
        placed.systemToken !== 'jar' &&
        placed.systemToken !== 'bag')
    )
      return null

    // Системные предметы (ключ и т.п.) — не шаблоны, создаются сразу
    const systemDef = SYSTEM_ITEMS[slot]
    const item = systemDef ? { ...systemDef } : { slot, rarity: rarity ?? null, isTemplate: true }
    if (!item) return null
    if (!placed.items) placed.items = []
    const MAX_CONTAINER_SLOTS = 6
    if (placed.items.length >= MAX_CONTAINER_SLOTS) {
      placed.items[placed.items.length - 1] = item
    } else {
      placed.items.push(item)
    }
    placed.name =
      placed.items.length === 1
        ? (item.name ?? ITEM_SLOT_LABELS[item.slot] ?? item.slot)
        : `${placed.name.split(' (')[0]} (${placed.items.length})`
    return item
  }

  /** Открыть контейнер — переключить спрайт и сгенерировать лут с ilvl = heroLevel. */
  function openContainer(uid, heroLevel = 1) {
    const placed = placedTokens.value.find((t) => t.uid === uid)
    if (!placed || placed.opened) return null
    placed.opened = true
    if (placed.srcOpened) placed.src = placed.srcOpened
    // Если предметы были сконфигурированы — генерируем и выбрасываем как лут
    if (placed.items?.length) {
      for (const raw of placed.items) {
        // Шаблоны генерируются по уровню героя
        const item = raw.isTemplate
          ? generateItem(raw.slot, heroLevel, Math.random, raw.rarity)
          : raw
        if (item) addGroundLoot(placed.col, placed.row, item)
      }
      placed.items = []
      // Найти кучку, в которую попали предметы
      const pile = groundItems.value.find(
        (g) => Math.abs(g.col - placed.col) + Math.abs(g.row - placed.row) <= MERGE_RADIUS
      )
      if (pile) {
        pile.sourceType = placed.systemToken === 'item' ? 'chest' : 'jar'
      }
      return pile ?? null
    }
    return null
  }

  return {
    groundItems,
    addGroundLoot,
    pickupGroundItem,
    addGroundBag,
    pickupBagItem,
    initGroundItems,
    configureItemToken,
    openContainer,
  }
}

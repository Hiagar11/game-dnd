import { ref, computed, watch } from 'vue'
import { useItemsStore } from '../stores/items'
import { useTraitsStore } from '../stores/traits'
import { normalizeInventorySnapshot } from '../utils/inventoryState'
import { RARITY_COLORS } from '../constants/lootRarity'
import {
  rollRarityCount,
  statWeightsForSlot,
  positiveTraitsPool,
  pickWeightedTraitIds,
} from '../utils/lootGenerator'
import { translateSlot, buildTooltipRows } from '../utils/itemTooltip'

export function useInventoryPanel(props, emit) {
  const itemsStore = useItemsStore()
  const traitsStore = useTraitsStore()

  const initialInventory = normalizeInventorySnapshot(props.modelValue)
  const cells = ref(initialInventory.cells)
  const equipped = ref(initialInventory.equipped)

  const drag = ref(null)
  const dragOverSlot = ref(null)
  const dragOverBag = ref(null)
  const syncingFromParent = ref(false)

  const EQUIP_SLOTS = [
    { key: 'helmet', label: 'Шлем', title: 'Шлем' },
    { key: 'amulet', label: 'Амулет', title: 'Амулет' },
    { key: 'cloak', label: 'Плащ', title: 'Плащ' },
    { key: 'armor', label: 'Броня', title: 'Броня' },
    { key: 'weapon', label: 'Оружие', title: 'Оружие' },
    { key: 'offhand', label: 'Щит', title: 'Щит / доп. рука' },
    { key: 'gloves', label: 'Перч.', title: 'Перчатки' },
    { key: 'belt', label: 'Пояс', title: 'Пояс' },
    { key: 'legs', label: 'Ноги', title: 'Поножи' },
    { key: 'boots', label: 'Сапоги', title: 'Сапоги' },
    { key: 'ring-left', label: 'Кольцо', title: 'Кольцо (лев.)' },
    { key: 'ring-right', label: 'Кольцо', title: 'Кольцо (пр.)' },
  ]

  const EQUIP_SLOT_ACCEPTS = {
    helmet: ['helmet'],
    amulet: ['amulet'],
    cloak: ['cloak'],
    armor: ['armor'],
    weapon: ['weapon', 'magic_weapon', 'ranged', 'two_handed'],
    offhand: ['offhand', 'weapon', 'magic_weapon'],
    gloves: ['gloves'],
    belt: ['belt'],
    legs: ['legs'],
    boots: ['boots'],
    'ring-left': ['ring'],
    'ring-right': ['ring'],
  }

  function isTwoHanded(item) {
    return item?.slot === 'two_handed' || item?.slot === 'ranged'
  }

  const tooltip = ref({ visible: false, item: null, x: 0, y: 0 })
  const tooltipStyle = computed(() => ({
    top: `${tooltip.value.y}px`,
    left: `${tooltip.value.x}px`,
  }))

  function gameIconUrl(slug) {
    return `https://api.iconify.design/game-icons/${slug}.svg`
  }

  function iconMaskStyle(cell) {
    const url = gameIconUrl(cell.icon)
    return {
      maskImage: `url('${url}')`,
      webkitMaskImage: `url('${url}')`,
      backgroundColor: cell.rarityColor || '#ffffff',
    }
  }

  function iconMaskStyleGhost(cell) {
    if (!cell) return {}
    const url = gameIconUrl(cell.icon)
    return {
      maskImage: `url('${url}')`,
      webkitMaskImage: `url('${url}')`,
      backgroundColor: cell.rarityColor || '#ffffff',
      opacity: '0.3',
    }
  }

  function generateAndPlaceItem(cellIdx) {
    const items = itemsStore.items
    const traits = traitsStore.traits
    if (!items.length) return

    const item = items[Math.floor(Math.random() * items.length)]

    if (item.effects?.length || item.traitIds?.length || item.rarityColor) {
      cells.value[cellIdx] = {
        ...item,
        traitIds: [...(item.traitIds ?? [])],
        effects: [...(item.effects ?? [])],
        rarityColor:
          item.rarityColor ?? RARITY_COLORS[Math.min(4, item.traitIds?.length ?? 0)] ?? '#ffffff',
      }
      return
    }

    const slotWeights = statWeightsForSlot(item.slot)
    if (!Object.keys(slotWeights).length) {
      cells.value[cellIdx] = { ...item, traitIds: [], rarityColor: RARITY_COLORS[0] ?? '#c8a04a' }
      return
    }

    const relevant = traits.filter((t) =>
      (t.mods ?? []).some((m) => Number(m.value) > 0 && (slotWeights[m.stat] ?? 0) > 0)
    )
    const positive = positiveTraitsPool(traits)
    const poolTraits = relevant.length >= 4 ? relevant : positive.length ? positive : traits

    const maxTraits = Math.min(4, poolTraits.length)
    const count = maxTraits > 0 ? rollRarityCount(item.slot, maxTraits) : 0
    const selectedIds =
      count > 0 ? pickWeightedTraitIds(poolTraits, count, item.slot, props.ownerStats) : []

    cells.value[cellIdx] = {
      ...item,
      traitIds: selectedIds,
      rarityColor: RARITY_COLORS[selectedIds.length] ?? '#ffffff',
    }
  }

  function tooltipRows(item) {
    return buildTooltipRows(item, traitsStore.traits)
  }

  function canDropOnSlot(slotKey) {
    if (!drag.value) return false
    const item = drag.value.item
    if (!EQUIP_SLOT_ACCEPTS[slotKey]?.includes(item?.slot)) return false
    if (slotKey === 'weapon' && isTwoHanded(item) && equipped.value.offhand) return false
    if (slotKey === 'offhand' && isTwoHanded(equipped.value.weapon)) return false
    return true
  }

  function equipDragClass(slotKey) {
    if (dragOverSlot.value !== slotKey) return null
    return canDropOnSlot(slotKey) ? 'inv-panel__slot--drag-valid' : 'inv-panel__slot--drag-invalid'
  }

  function onBagDragStart(event, idx) {
    const item = cells.value[idx]
    if (!item) return
    drag.value = { source: 'bag', bagIdx: idx, slotKey: null, item }
    event.dataTransfer.effectAllowed = 'move'
  }

  function onEquipDragStart(event, slotKey) {
    const item = equipped.value[slotKey]
    if (!item) return
    drag.value = { source: 'equip', bagIdx: null, slotKey, item }
    event.dataTransfer.effectAllowed = 'move'
  }

  function onDragEnd() {
    drag.value = null
    dragOverSlot.value = null
    dragOverBag.value = null
  }

  function onEquipDragOver(event, slotKey) {
    dragOverSlot.value = slotKey
    event.dataTransfer.dropEffect = canDropOnSlot(slotKey) ? 'move' : 'none'
  }

  function onEquipDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dragOverSlot.value = null
    }
  }

  function onEquipDrop(event, slotKey) {
    dragOverSlot.value = null
    if (!drag.value || !canDropOnSlot(slotKey)) return
    const incoming = drag.value.item
    const displaced = equipped.value[slotKey]

    if (slotKey === 'weapon' && isTwoHanded(incoming)) {
      const offhandItem = equipped.value.offhand
      if (offhandItem) {
        const freeIdx = cells.value.indexOf(null)
        if (freeIdx !== -1) cells.value[freeIdx] = offhandItem
        else cells.value.push(offhandItem)
        equipped.value.offhand = null
      }
    }

    equipped.value[slotKey] = incoming
    if (drag.value.source === 'bag') {
      cells.value[drag.value.bagIdx] = displaced
    } else {
      if (drag.value.slotKey === 'weapon' && isTwoHanded(incoming)) {
        equipped.value.offhand = null
      }
      equipped.value[drag.value.slotKey] = displaced
    }
    drag.value = null
  }

  function onBagDragOver(event, idx) {
    dragOverBag.value = idx
    event.dataTransfer.dropEffect = 'move'
  }

  function onBagDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dragOverBag.value = null
    }
  }

  function onBagDrop(event, idx) {
    dragOverBag.value = null
    if (!drag.value) return
    const incoming = drag.value.item
    const displaced = cells.value[idx]
    cells.value[idx] = incoming
    if (drag.value.source === 'bag') {
      cells.value[drag.value.bagIdx] = displaced
    } else {
      equipped.value[drag.value.slotKey] = displaced
    }
    drag.value = null
  }

  function onBagRightClick(event, idx) {
    if (event.ctrlKey) {
      const item = cells.value[idx]
      if (item) autoEquip(idx, item)
    } else {
      generateAndPlaceItem(idx)
    }
  }

  function autoEquip(bagIdx, item) {
    const candidates = Object.entries(EQUIP_SLOT_ACCEPTS)
      .filter(([, accepts]) => accepts.includes(item.slot))
      .map(([key]) => key)
    if (!candidates.length) return

    if (isTwoHanded(item)) {
      if (!equipped.value.weapon && !equipped.value.offhand) {
        equipped.value.weapon = item
        cells.value[bagIdx] = null
        return
      }
      if (!equipped.value.weapon && equipped.value.offhand) return

      const old = equipped.value.weapon
      const offOld = equipped.value.offhand
      equipped.value.weapon = item
      equipped.value.offhand = null
      cells.value[bagIdx] = old
      if (offOld) {
        const fi = cells.value.indexOf(null)
        if (fi !== -1) cells.value[fi] = offOld
      }
      return
    }

    const filteredCandidates = candidates.filter((k) => {
      if (k === 'weapon' && isTwoHanded(equipped.value.weapon)) return false
      if (k === 'offhand' && isTwoHanded(equipped.value.weapon)) return false
      return true
    })
    const pool = filteredCandidates.length ? filteredCandidates : candidates

    const freeSlot = pool.find((k) => !equipped.value[k])
    if (freeSlot) {
      equipped.value[freeSlot] = item
      cells.value[bagIdx] = null
      return
    }
    const target = pool[0]
    if (!target) return
    const old = equipped.value[target]
    if (target === 'weapon' && isTwoHanded(old)) equipped.value.offhand = null
    cells.value[bagIdx] = old
    equipped.value[target] = item
  }

  function showTooltipForItem(event, item) {
    if (!item) return
    const rect = event.currentTarget.getBoundingClientRect()
    tooltip.value = { visible: true, item, x: rect.right + 8, y: rect.top }
  }

  function hideTooltip() {
    tooltip.value.visible = false
  }

  watch(
    () => props.modelValue,
    (value) => {
      syncingFromParent.value = true
      const normalized = normalizeInventorySnapshot(value)
      cells.value = normalized.cells
      equipped.value = normalized.equipped
      syncingFromParent.value = false
    },
    { immediate: true, deep: true }
  )

  watch(
    [cells, equipped],
    () => {
      if (syncingFromParent.value) return
      emit(
        'update:modelValue',
        normalizeInventorySnapshot({ cells: cells.value, equipped: equipped.value })
      )
    },
    { deep: true }
  )

  return {
    cells,
    equipped,
    drag,
    dragOverBag,
    tooltip,
    tooltipStyle,
    EQUIP_SLOTS,
    isTwoHanded,
    translateSlot,
    tooltipRows,
    iconMaskStyle,
    iconMaskStyleGhost,
    equipDragClass,
    onEquipDragStart,
    onDragEnd,
    onEquipDragOver,
    onEquipDragLeave,
    onEquipDrop,
    onBagRightClick,
    onBagDragStart,
    onBagDragOver,
    onBagDragLeave,
    onBagDrop,
    showTooltipForItem,
    hideTooltip,
  }
}

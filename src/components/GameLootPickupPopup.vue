<template>
  <PopupShell :visible="!!pile" aria-label="Предметы на земле" @close="$emit('close')">
    <h2 class="loot-popup__title">Предметы на земле</h2>

    <div class="loot-popup__body">
      <!-- ─── Левая часть: предметы на земле ──────────────────────── -->
      <div class="loot-popup__ground">
        <p class="loot-popup__section-title">На полу</p>
        <div class="loot-popup__grid">
          <div
            v-for="(item, i) in pileItems"
            :key="i"
            class="loot-popup__cell"
            @click="pickupItem(i)"
            @mouseenter="showTooltip($event, item)"
            @mouseleave="hideTooltip"
          >
            <span
              v-if="item?.icon && isIconLoaded(item.icon)"
              class="loot-popup__cell-icon"
              :style="iconMaskStyle(item)"
            />
            <span v-else-if="item?.icon" class="loot-popup__cell-loader" />
            <span v-else-if="item" class="loot-popup__cell-name">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- ─── Правая часть: инвентарь героя ───────────────────────── -->
      <div class="loot-popup__hero">
        <p class="loot-popup__section-title">
          {{ heroToken ? `Сумка — ${heroToken.name}` : 'Нет героя' }}
        </p>
        <div v-if="heroToken" class="loot-popup__grid">
          <div
            v-for="(cell, i) in heroCells"
            :key="i"
            class="loot-popup__cell"
            @mouseenter="showTooltip($event, cell)"
            @mouseleave="hideTooltip"
          >
            <span
              v-if="cell?.icon && isIconLoaded(cell.icon)"
              class="loot-popup__cell-icon"
              :style="iconMaskStyle(cell)"
            />
            <span v-else-if="cell?.icon" class="loot-popup__cell-loader" />
            <span v-else-if="cell" class="loot-popup__cell-name">{{ cell.name }}</span>
          </div>
        </div>
        <p v-else class="loot-popup__empty">Выберите героя на карте</p>
      </div>
    </div>

    <!-- Тултип -->
    <Teleport to="body">
      <Transition name="loot-tt">
        <div v-show="tooltip.visible && tooltip.item" class="inv-tooltip" :style="ttStyle">
          <template v-if="tooltip.item">
            <div class="inv-tooltip__bar" :style="{ background: tooltip.item.rarityColor }" />
            <p class="inv-tooltip__name" :style="{ color: tooltip.item.rarityColor }">
              {{ tooltip.item.name }}
            </p>
            <p class="inv-tooltip__slot">{{ translateSlot(tooltip.item.slot) }}</p>
            <ul v-if="ttRows.length" class="inv-tooltip__list">
              <li v-for="(row, ri) in ttRows" :key="row.key ?? ri" class="inv-tooltip__item">
                <span class="inv-tooltip__trait-name">{{ row.name }}</span>
                <span
                  v-for="(mod, mi) in row.mods"
                  :key="`${row.key ?? ri}_${mi}`"
                  :class="[
                    'inv-tooltip__mod',
                    mod.positive ? 'inv-tooltip__mod--pos' : 'inv-tooltip__mod--neg',
                  ]"
                  >{{ mod.text }}</span
                >
              </li>
            </ul>
          </template>
        </div>
      </Transition>
    </Teleport>
  </PopupShell>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import PopupShell from './PopupShell.vue'
  import { useGameStore } from '../stores/game'
  import { useTraitsStore } from '../stores/traits'
  import { getHeroTokens } from '../utils/tokenFilters'
  import { translateSlot, buildTooltipRows } from '../utils/itemTooltip'

  const ICON_BASE = 'https://api.iconify.design/game-icons/'
  const loadedIcons = new Set()
  const pendingIcons = new Set()

  function isIconLoaded(slug) {
    if (!slug) return false
    if (loadedIcons.has(slug)) return true
    if (!pendingIcons.has(slug)) {
      pendingIcons.add(slug)
      const img = new Image()
      img.onload = () => loadedIcons.add(slug)
      img.src = `${ICON_BASE}${slug}.svg`
    }
    return false
  }

  const props = defineProps({
    pile: { type: Object, default: null },
  })

  const emit = defineEmits(['close'])

  const store = useGameStore()
  const traitsStore = useTraitsStore()

  const pileItems = computed(() => props.pile?.items ?? [])

  // Найти героя: выбранный токен (если герой) или ближайший герой к кучке
  const heroToken = computed(() => {
    const heroes = getHeroTokens(store.placedTokens)
    if (!heroes.length) return null

    // Если выбран герой на карте — используем его
    const selected = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    if (selected?.tokenType === 'hero') return selected

    // Иначе ближайший к кучке
    if (!props.pile) return heroes[0]
    let best = heroes[0]
    let bestDist = Infinity
    for (const h of heroes) {
      const d = Math.abs(h.col - props.pile.col) + Math.abs(h.row - props.pile.row)
      if (d < bestDist) {
        bestDist = d
        best = h
      }
    }
    return best
  })

  const heroCells = computed(() => heroToken.value?.inventory?.cells ?? [])

  function pickupItem(itemIdx) {
    if (!props.pile || !heroToken.value) return
    const inv = heroToken.value.inventory
    if (!inv) return

    // Найти свободную ячейку
    const freeIdx = inv.cells.findIndex((c) => c === null)
    if (freeIdx === -1) return // Сумка полная

    const item = store.pickupGroundItem(props.pile.id, itemIdx)
    if (!item) return

    inv.cells[freeIdx] = item

    // Если кучка опустела — закрыть попап
    if (!props.pile || !store.groundItems.find((g) => g.id === props.pile?.id)) {
      emit('close')
    }
  }

  // ─── Tooltip ──────────────────────────────────────────────────────────────
  const tooltip = ref({ visible: false, item: null, x: 0, y: 0 })
  const ttStyle = computed(() => ({ top: `${tooltip.value.y}px`, left: `${tooltip.value.x}px` }))
  const ttRows = computed(() =>
    tooltip.value.item ? buildTooltipRows(tooltip.value.item, traitsStore.traits) : []
  )

  function iconMaskStyle(cell) {
    const url = `${ICON_BASE}${cell.icon}.svg`
    return {
      maskImage: `url('${url}')`,
      webkitMaskImage: `url('${url}')`,
      backgroundColor: cell.rarityColor || '#ffffff',
    }
  }

  function showTooltip(event, item) {
    if (!item) return
    const rect = event.currentTarget.getBoundingClientRect()
    tooltip.value = { visible: true, item, x: rect.right + 8, y: rect.top }
  }

  function hideTooltip() {
    tooltip.value.visible = false
  }
</script>

<style scoped lang="scss" src="../assets/styles/components/gameLootPickupPopup.scss"></style>

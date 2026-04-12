<template>
  <div class="inv-panel">
    <!-- ─── ЛЕВАЯ ЧАСТЬ: бумажная кукла с ячейками экипировки ──────── -->
    <div class="inv-panel__doll">
      <!-- Силуэт персонажа — декоративный, указывает зоны надевания -->
      <svg
        class="inv-panel__silhouette"
        viewBox="0 0 240 380"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <!-- Голова -->
        <ellipse cx="120" cy="36" rx="24" ry="28" />
        <!-- Шея -->
        <rect x="112" y="63" width="16" height="14" rx="4" />
        <!-- Туловище -->
        <path
          d="M76 80 C58 84 54 108 54 136 L54 206 C54 212 60 214 76 214
             L164 214 C180 214 186 212 186 206 L186 136 C186 108 182 84 164 80 Z"
        />
        <!-- Левая рука -->
        <path
          d="M60 94 C40 108 34 140 36 172 C36 180 42 184 50 180
             C58 176 60 168 60 158 C58 132 66 112 78 102 Z"
        />
        <!-- Правая рука -->
        <path
          d="M180 94 C200 108 206 140 204 172 C204 180 198 184 190 180
             C182 176 180 168 180 158 C182 132 174 112 162 102 Z"
        />
        <!-- Левая нога -->
        <path
          d="M80 212 C74 248 72 284 72 320 C72 332 78 338 90 338
             C102 338 106 332 106 320 C106 284 104 248 100 212 Z"
        />
        <!-- Правая нога -->
        <path
          d="M140 212 C136 248 134 284 134 320 C134 332 138 338 150 338
             C162 338 168 332 168 320 C168 284 166 248 160 212 Z"
        />
        <!-- Левая стопа -->
        <ellipse cx="88" cy="350" rx="20" ry="8" />
        <!-- Правая стопа -->
        <ellipse cx="152" cy="350" rx="20" ry="8" />
      </svg>

      <!-- ── Ячейки экипировки ──────────────────────────────────────── -->
      <div
        v-for="slot in EQUIP_SLOTS"
        :key="slot.key"
        :class="[
          'inv-panel__slot',
          `inv-panel__slot--${slot.key}`,
          equipDragClass(slot.key),
          { 'inv-panel__slot--ghost': slot.key === 'offhand' && isTwoHanded(equipped.weapon) },
        ]"
        :title="slot.title"
        :draggable="
          !!equipped[slot.key] && !(slot.key === 'offhand' && isTwoHanded(equipped.weapon))
        "
        @dragstart="onEquipDragStart($event, slot.key)"
        @dragend="onDragEnd"
        @dragover.prevent="onEquipDragOver($event, slot.key)"
        @dragleave="onEquipDragLeave($event)"
        @drop.prevent="onEquipDrop($event, slot.key)"
        @mouseenter="showTooltipForItem($event, equipped[slot.key])"
        @mouseleave="hideTooltip"
      >
        <span
          v-if="slot.key === 'offhand' && isTwoHanded(equipped.weapon)"
          class="inv-panel__slot-icon inv-panel__slot-icon--ghost"
          :style="iconMaskStyleGhost(equipped.weapon)"
        />
        <span
          v-else-if="equipped[slot.key]?.icon"
          class="inv-panel__slot-icon"
          :style="iconMaskStyle(equipped[slot.key])"
        />
        <span v-else class="inv-panel__slot-label">{{ slot.label }}</span>
      </div>
    </div>

    <!-- ─── ПРАВАЯ ЧАСТЬ: сетка предметов в сумке ─────────────────── -->
    <div class="inv-panel__bag">
      <p class="inv-panel__bag-title">Сумка</p>
      <div class="inv-panel__grid">
        <div
          v-for="(cell, i) in cells"
          :key="i"
          :class="[
            'inv-panel__cell',
            { 'inv-panel__cell--wide': isTwoHanded(cell) },
            { 'inv-panel__cell--dragging': drag?.source === 'bag' && drag?.bagIdx === i },
            { 'inv-panel__cell--drag-over': dragOverBag === i },
          ]"
          :draggable="!!cell"
          @contextmenu.prevent="onBagRightClick($event, i)"
          @dragstart="onBagDragStart($event, i)"
          @dragend="onDragEnd"
          @dragover.prevent="onBagDragOver($event, i)"
          @dragleave="onBagDragLeave($event)"
          @drop.prevent="onBagDrop($event, i)"
          @mouseenter="showTooltipForItem($event, cell)"
          @mouseleave="hideTooltip"
        >
          <span v-if="cell?.icon" class="inv-panel__cell-icon" :style="iconMaskStyle(cell)" />
          <span v-else-if="cell" class="inv-panel__cell-name">{{ cell.name }}</span>
        </div>
      </div>
    </div>

    <!-- Тултип предмета при наведении -->
    <Teleport to="body">
      <Transition name="inv-tt">
        <div v-show="tooltip.visible && tooltip.item" class="inv-tooltip" :style="tooltipStyle">
          <template v-if="tooltip.item">
            <div class="inv-tooltip__bar" :style="{ background: tooltip.item.rarityColor }" />
            <p class="inv-tooltip__name" :style="{ color: tooltip.item.rarityColor }">
              {{ tooltip.item.name }}
            </p>
            <p class="inv-tooltip__slot">{{ translateSlot(tooltip.item.slot) }}</p>
            <ul v-if="tooltipRows(tooltip.item).length" class="inv-tooltip__list">
              <li
                v-for="(row, rowIndex) in tooltipRows(tooltip.item)"
                :key="row.key ?? rowIndex"
                class="inv-tooltip__item"
              >
                <span class="inv-tooltip__trait-name">{{ row.name }}</span>
                <span
                  v-for="(mod, mi) in row.mods"
                  :key="`${row.key ?? rowIndex}_${mi}`"
                  :class="[
                    'inv-tooltip__mod',
                    mod.positive ? 'inv-tooltip__mod--pos' : 'inv-tooltip__mod--neg',
                  ]"
                  >{{ mod.text }}</span
                >
              </li>
            </ul>
            <p v-else class="inv-tooltip__empty">Нет свойств</p>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
  import { useInventoryPanel } from '../composables/useInventoryPanel'

  const props = defineProps({
    modelValue: {
      type: Object,
      default: null,
    },
    generationLevel: {
      type: Number,
      default: 1,
    },
    ownerStats: {
      type: Object,
      default: () => ({}),
    },
  })

  const emit = defineEmits(['update:modelValue'])

  const {
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
  } = useInventoryPanel(props, emit)
</script>

<style scoped src="../assets/styles/components/gameInventoryPanel.css"></style>

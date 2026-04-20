<template>
  <div class="inv-panel" @dragover.prevent @drop.prevent="onPanelDrop">
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

      <!-- ── Кошелёк (слева от шлема) ──────────────────────────────── -->
      <div class="inv-panel__wallet">
        <svg
          class="inv-panel__wallet-icon"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <!-- Монетки, падающие сверху -->
          <circle
            cx="14"
            cy="6"
            r="3.5"
            fill="#ffd700"
            stroke="#b8960a"
            stroke-width="0.6"
            opacity="0.85"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0;0,2;0,0"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx="24"
            cy="4"
            r="3"
            fill="#c0c0c0"
            stroke="#8a8a8a"
            stroke-width="0.6"
            opacity="0.7"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0;0,3;0,0"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx="19"
            cy="8"
            r="2.5"
            fill="#cd7f32"
            stroke="#8b5a1e"
            stroke-width="0.5"
            opacity="0.65"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0;0,1.5;0,0"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <!-- Открытый кошелёк -->
          <path
            d="M8 18 Q6 16 10 14 L30 14 Q34 16 32 18"
            fill="#6b4c2a"
            stroke="#8b6a3e"
            stroke-width="0.8"
          />
          <path
            d="M8 18 Q6 22 8 30 Q10 36 20 36 Q30 36 32 30 Q34 22 32 18 Z"
            fill="#5a3d1e"
            stroke="#8b6a3e"
            stroke-width="1"
          />
          <!-- Ремешок -->
          <path d="M10 24 Q20 22 30 24" fill="none" stroke="#8b6a3e" stroke-width="0.8" />
          <!-- Застёжка -->
          <circle cx="20" cy="23" r="1.8" fill="#c8983c" stroke="#a07830" stroke-width="0.6" />
        </svg>
        <div class="inv-panel__wallet-row">
          <span v-if="coinDisplay.gold" class="inv-panel__wallet-val inv-panel__wallet-val--gold">
            {{ coinDisplay.gold }}
          </span>
          <span
            v-if="coinDisplay.silver"
            class="inv-panel__wallet-val inv-panel__wallet-val--silver"
          >
            {{ coinDisplay.silver }}
          </span>
          <span class="inv-panel__wallet-val inv-panel__wallet-val--copper">
            {{ coinDisplay.copper || 0 }}
          </span>
        </div>
      </div>

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
          v-else-if="equipped[slot.key]?.icon && isIconLoaded(equipped[slot.key].icon)"
          class="inv-panel__slot-icon"
          :style="iconMaskStyle(equipped[slot.key])"
        />
        <span v-else-if="equipped[slot.key]?.icon" class="inv-panel__slot-loader" />
        <span v-else class="inv-panel__slot-label">{{ slot.label }}</span>
      </div>
    </div>

    <!-- ─── ПРАВАЯ ЧАСТЬ: сетка предметов в сумке ─────────────────── -->
    <div class="inv-panel__bag">
      <div class="inv-panel__bag-header">
        <p class="inv-panel__bag-title">Сумка</p>
        <button class="inv-panel__add-btn" title="Добавить предмет" @click="toggleItemPicker">
          ＋
        </button>
        <div v-if="isDev" class="inv-panel__dev-btns">
          <button
            class="inv-panel__dev-btn inv-panel__dev-btn--coin"
            title="Добавить 100 медяков (DEV)"
            @click="addCopper(100)"
          >
            +100 🪙
          </button>
          <button
            class="inv-panel__clear-btn"
            title="Очистить весь инвентарь (DEV)"
            @click="clearAll()"
          >
            ✕ Очистить
          </button>
        </div>
      </div>

      <!-- ── Встроенный пикер предметов ──────────────────────────── -->
      <Transition name="inv-picker">
        <div v-if="pickerOpen" class="inv-panel__picker">
          <template v-if="pickerStage === 'slot'">
            <div class="inv-panel__picker-tabs">
              <button
                class="inv-panel__picker-tab"
                :class="{ 'inv-panel__picker-tab--active': pickerTab === 'slots' }"
                @click="pickerTab = 'slots'"
              >
                Слоты
              </button>
              <button
                class="inv-panel__picker-tab"
                :class="{ 'inv-panel__picker-tab--active': pickerTab === 'system' }"
                @click="pickerTab = 'system'"
              >
                Системные
              </button>
            </div>
            <div class="inv-panel__picker-list">
              <template v-if="pickerTab === 'slots'">
                <button
                  v-for="slot in ITEM_SLOTS"
                  :key="slot"
                  class="inv-panel__picker-row"
                  @click="onPickSlot(slot)"
                >
                  {{ ITEM_SLOT_LABELS[slot] }}
                </button>
              </template>
              <template v-else>
                <button class="inv-panel__picker-row" @click="onPickSlot('random')">
                  🎲 Случайный
                </button>
                <button class="inv-panel__picker-row" @click="onPickSystemKey">🔑 Ключ</button>
              </template>
            </div>
          </template>
          <template v-else>
            <button class="inv-panel__picker-back" @click="pickerStage = 'slot'">← Назад</button>
            <div class="inv-panel__picker-list">
              <button
                v-for="r in RARITIES"
                :key="r"
                class="inv-panel__picker-row"
                @click="onPickRarity(r)"
              >
                <span class="inv-panel__picker-dot" :style="{ background: RARITY_COLORS[r] }" />
                {{ RARITY_LABELS[r] }}
              </button>
            </div>
          </template>
        </div>
      </Transition>

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
          <span
            v-if="cell?.icon && isIconLoaded(cell.icon)"
            class="inv-panel__cell-icon"
            :style="iconMaskStyle(cell)"
          />
          <span v-else-if="cell?.icon" class="inv-panel__cell-loader" />
          <span v-else-if="cell" class="inv-panel__cell-name">{{ cell.name }}</span>
        </div>
      </div>
    </div>

    <!-- Тултип предмета при наведении -->
    <Teleport to="body">
      <Transition name="inv-tt">
        <div
          v-show="tooltip.visible && tooltip.item"
          class="inv-tooltip-wrap"
          :style="tooltipStyle"
        >
          <div class="inv-tooltip">
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

          <div v-if="compareItem" class="inv-tooltip inv-tooltip--compare">
            <p class="inv-tooltip__label">Снаряжено</p>
            <div class="inv-tooltip__bar" :style="{ background: compareItem.rarityColor }" />
            <p class="inv-tooltip__name" :style="{ color: compareItem.rarityColor }">
              {{ compareItem.name }}
            </p>
            <p class="inv-tooltip__slot">{{ translateSlot(compareItem.slot) }}</p>
            <ul v-if="tooltipRows(compareItem).length" class="inv-tooltip__list">
              <li
                v-for="(row, ri) in tooltipRows(compareItem)"
                :key="row.key ?? ri"
                class="inv-tooltip__item"
              >
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
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useInventoryPanel } from '../composables/useInventoryPanel'
  import { ITEM_SLOTS, ITEM_SLOT_LABELS } from '../constants/itemSlots'
  import { RARITIES, RARITY_COLORS, RARITY_LABELS } from '../constants/lootRarity'

  const isDev = import.meta.env.DEV

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

  const emit = defineEmits(['update:modelValue', 'drop-item'])

  const {
    cells,
    equipped,
    coinDisplay,
    drag,
    dragOverBag,
    tooltip,
    tooltipStyle,
    compareItem,
    EQUIP_SLOTS,
    isTwoHanded,
    translateSlot,
    tooltipRows,
    iconMaskStyle,
    iconMaskStyleGhost,
    isIconLoaded,
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
    clearAll,
    addCopper,
    addItem,
    onPanelDrop,
  } = useInventoryPanel(props, emit)

  // ── Пикер предметов ──────────────────────────────────────────────────────
  const pickerOpen = ref(false)
  const pickerStage = ref('slot')
  const pickerTab = ref('slots')
  const pickerSlot = ref(null)

  function toggleItemPicker() {
    pickerOpen.value = !pickerOpen.value
    pickerStage.value = 'slot'
    pickerTab.value = 'slots'
    pickerSlot.value = null
  }

  function onPickSlot(slot) {
    pickerSlot.value = slot
    pickerStage.value = 'rarity'
  }

  function onPickRarity(rarity) {
    addItem(pickerSlot.value, rarity)
    pickerOpen.value = false
    pickerStage.value = 'slot'
    pickerSlot.value = null
  }

  /** Системный ключ — добавляется сразу, без выбора редкости */
  function onPickSystemKey() {
    addItem('key', null)
    pickerOpen.value = false
    pickerStage.value = 'slot'
    pickerSlot.value = null
  }
</script>

<style scoped src="../assets/styles/components/gameInventoryPanel.css"></style>

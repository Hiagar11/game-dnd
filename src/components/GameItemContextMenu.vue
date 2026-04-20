<template>
  <Transition name="ctx">
    <div v-if="visible" class="item-ctx-menu" @click.stop @contextmenu.stop.prevent>
      <!-- Кнопка удаления -->
      <button
        class="item-ctx-menu__remove"
        title="Убрать с карты"
        @mouseenter="playHover"
        @click="onRemove"
      >
        <PhX :size="12" weight="bold" />
      </button>
      <!-- Кнопка замка (только для сундуков) -->
      <button
        v-if="lockable"
        class="item-ctx-menu__lock"
        :title="locked ? 'Снять замок' : 'Поставить замок'"
        @mouseenter="playHover"
        @click="onToggleLock"
      >
        {{ locked ? '🔓' : '🔒' }}
      </button>
      <!-- ── Этап 1: категории предметов ──────────────────── -->
      <template v-if="stage === 'category'">
        <div class="item-ctx-menu__tabs">
          <button
            class="item-ctx-menu__tab"
            :class="{ 'item-ctx-menu__tab--active': tab === 'slots' }"
            @click="tab = 'slots'"
          >
            Слоты
          </button>
          <button
            class="item-ctx-menu__tab"
            :class="{ 'item-ctx-menu__tab--active': tab === 'system' }"
            @click="tab = 'system'"
          >
            Системные
          </button>
        </div>

        <div class="item-ctx-menu__list">
          <template v-if="tab === 'slots'">
            <button
              v-for="slot in ITEM_SLOTS"
              :key="slot"
              class="item-ctx-menu__row"
              @mouseenter="playHover"
              @click="pickSlot(slot)"
            >
              <span class="item-ctx-menu__icon" :style="slotIconStyle(slot)" />
              <span class="item-ctx-menu__label">{{ ITEM_SLOT_LABELS[slot] }}</span>
            </button>
          </template>
          <template v-else>
            <button class="item-ctx-menu__row" @mouseenter="playHover" @click="pickSlot('random')">
              <span class="item-ctx-menu__icon item-ctx-menu__icon--emoji">🎲</span>
              <span class="item-ctx-menu__label">Случайный</span>
            </button>
            <button class="item-ctx-menu__row" @mouseenter="playHover" @click="pickSystemKey">
              <span class="item-ctx-menu__icon" :style="keyIconStyle" />
              <span class="item-ctx-menu__label">Ключ</span>
            </button>
          </template>
        </div>
      </template>

      <!-- ── Этап 2: выбор редкости ───────────────────────── -->
      <template v-if="stage === 'rarity'">
        <button class="item-ctx-menu__back" @click="stage = 'category'">← Назад</button>
        <div class="item-ctx-menu__list">
          <button
            v-for="r in RARITIES"
            :key="r"
            class="item-ctx-menu__row"
            @mouseenter="playHover"
            @click="pickRarity(r)"
          >
            <span class="item-ctx-menu__dot" :style="{ background: RARITY_COLORS[r] }" />
            <span class="item-ctx-menu__label">{{ RARITY_LABELS[r] }}</span>
          </button>
        </div>
      </template>
    </div>
  </Transition>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { PhX } from '@phosphor-icons/vue'
  import { ITEM_SLOTS, ITEM_SLOT_LABELS, ITEM_SLOT_ICONS } from '../constants/itemSlots'
  import { RARITIES, RARITY_COLORS, RARITY_LABELS } from '../constants/lootRarity'
  import { useSound } from '../composables/useSound'

  const ICON_BASE = 'https://api.iconify.design/game-icons/'

  defineProps({
    visible: { type: Boolean, required: true },
    lockable: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
  })

  const emit = defineEmits(['configure', 'close', 'remove', 'toggle-lock'])
  const { playHover, playClick } = useSound()

  const stage = ref('category')
  const tab = ref('slots')
  const chosenSlot = ref(null)

  function onRemove() {
    emit('remove')
    playClick()
  }

  function onToggleLock() {
    emit('toggle-lock')
    playClick()
  }

  const keyIconStyle = computed(() => {
    const url = `${ICON_BASE}key.svg`
    return {
      maskImage: `url(${url})`,
      WebkitMaskImage: `url(${url})`,
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      background: '#e2e8f0',
    }
  })

  function slotIconStyle(slot) {
    const slug = ITEM_SLOT_ICONS[slot]
    if (!slug) return {}
    const url = `${ICON_BASE}${slug}.svg`
    return {
      maskImage: `url(${url})`,
      WebkitMaskImage: `url(${url})`,
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      background: '#e2e8f0',
    }
  }

  function pickSlot(slot) {
    playClick()
    chosenSlot.value = slot
    stage.value = 'rarity'
  }

  /** Системный ключ — добавляется без выбора редкости */
  function pickSystemKey() {
    playClick()
    emit('configure', { slot: 'key', rarity: null })
    reset()
  }

  function pickRarity(rarity) {
    playClick()
    emit('configure', { slot: chosenSlot.value, rarity })
    reset()
  }

  function reset() {
    stage.value = 'category'
    tab.value = 'slots'
    chosenSlot.value = null
  }

  defineExpose({ reset })
</script>

<style scoped lang="scss" src="../assets/styles/components/gameItemContextMenu.scss"></style>

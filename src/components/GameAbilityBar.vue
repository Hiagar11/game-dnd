<template>
  <div class="ability-bar">
    <!-- ── Снаряжение (2 слота оружия) ─────────────────────────────── -->
    <div class="ability-bar__weapons">
      <div
        v-for="(w, slotKey) in weapons"
        :key="slotKey"
        class="ability-bar__weapon"
        :class="{ 'ability-bar__weapon--active': slotKey === activeWeaponSlot }"
        @click="switchWeapon(slotKey)"
      >
        <div v-if="w" class="ability-bar__weapon-icon" :style="weaponIconStyle(w)" />
        <div v-if="w" class="ability-bar__weapon-info">
          <span class="ability-bar__weapon-name">{{ w.name }}</span>
          <span v-if="w.baseDamage" class="ability-bar__weapon-dmg">
            {{ w.baseDamage.min }}–{{ w.baseDamage.max }}
          </span>
        </div>
        <span v-if="!w" class="ability-bar__weapon-name ability-bar__weapon-name--empty">
          {{ slotKey === 'weapon' ? 'Основное' : 'Запасное' }}
        </span>
        <PhSword
          v-if="slotKey === activeWeaponSlot && w"
          :size="12"
          weight="fill"
          class="ability-bar__armed-badge"
        />
      </div>
    </div>

    <!-- ── Сетка способностей 3×2 ──────────────────────────────────── -->
    <div class="ability-bar__slots">
      <button
        v-for="(slot, idx) in slots"
        :key="idx"
        class="ability-bar__cell"
        :class="{
          'ability-bar__cell--empty': !slot,
          'ability-bar__cell--active': activeSlot === idx,
          'ability-bar__cell--disabled': slot && !canUse(slot),
        }"
        :title="slot ? `${slot.name} (${slot.apCost} AP)` : `Ячейка ${idx + 1}`"
        @click="onSlotClick(idx)"
      >
        <span v-if="slot" class="ability-bar__icon" :style="slotIconStyle(slot)" />
        <span v-if="slot" class="ability-bar__hotkey">{{ idx + 1 }}</span>
        <span v-if="slot && slot.apCost" class="ability-bar__cost">{{ slot.apCost }}</span>
      </button>
    </div>

    <!-- Подсказка по выбранной способности -->
    <Transition name="ability-hint">
      <div v-if="activeAbility" class="ability-bar__hint">
        <span class="ability-bar__hint-name">{{ activeAbility.name }}</span>
        <span class="ability-bar__hint-desc">{{ activeAbility.description }}</span>
        <span class="ability-bar__hint-area"> Область: {{ activeAbility.areaLabel }} </span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
  import { PhSword } from '@phosphor-icons/vue'
  import { useGameStore } from '../stores/game'
  import { useAbilityExecution } from '../composables/useAbilityExecution'
  import { getSelectedNonSystemToken } from '../utils/tokenFilters'
  import { getActiveWeapon } from '../utils/combatFormulas'

  // Слоты оружия ближнего боя
  const MELEE_SLOTS = new Set(['weapon', 'two_handed'])

  const SLOT_COUNT = 6

  const store = useGameStore()
  const { isInstant, executeAbility } = useAbilityExecution()

  const placed = computed(() => {
    if (!store.selectedPlacedUid) return null
    return getSelectedNonSystemToken(store.placedTokens, store.selectedPlacedUid)
  })

  // ── Оружие ──────────────────────────────────────────────────────
  const weapons = computed(() => ({
    weapon: placed.value?.inventory?.equipped?.weapon ?? null,
    weapon2: placed.value?.inventory?.equipped?.weapon2 ?? null,
  }))

  const activeWeaponSlot = computed(() => placed.value?.activeWeaponSlot ?? 'weapon')

  const ICON_BASE = 'https://api.iconify.design/game-icons/'

  function weaponIconStyle(w) {
    if (!w?.icon) return {}
    const url = `${ICON_BASE}${w.icon}.svg`
    return {
      maskImage: `url('${url}')`,
      backgroundColor: w.rarityColor || '#ffffff',
    }
  }

  function switchWeapon(slotKey) {
    if (!placed.value) return
    if (slotKey === activeWeaponSlot.value) return
    const uid = placed.value.uid
    // В бою смена оружия стоит 1 AP
    if (store.combatMode) {
      if (!store.spendActionPoint(uid)) return
    }
    store.editPlacedToken(uid, { activeWeaponSlot: slotKey })
  }

  // ── Способности ─────────────────────────────────────────────────
  const slots = computed(() => {
    const raw = placed.value?.abilities ?? []
    const result = []
    for (let i = 0; i < SLOT_COUNT; i++) {
      result.push(raw[i] ?? null)
    }
    return result
  })

  const activeSlot = ref(null)

  // Сбрасываем подсветку слота, когда способность была использована
  watch(
    () => store.pendingAbility,
    (val) => {
      if (!val) activeSlot.value = null
    }
  )

  const activeAbility = computed(() => {
    if (activeSlot.value == null) return null
    return slots.value[activeSlot.value] ?? null
  })

  function canUse(ability) {
    if (!placed.value || !store.combatMode) return true
    // Способности с requiresMelee требуют оружие ближнего боя
    if (ability.requiresMelee) {
      const weapon = getActiveWeapon(placed.value)
      if (!weapon || !MELEE_SLOTS.has(weapon.slot)) return false
    }
    return (placed.value.actionPoints ?? 0) >= (ability.apCost ?? 1)
  }

  function onSlotClick(idx) {
    const ability = slots.value[idx]
    if (!ability) return
    if (!canUse(ability)) return

    if (activeSlot.value === idx) {
      // Повторный клик — снимаем выделение
      activeSlot.value = null
      store.pendingAbility = null
      return
    }

    activeSlot.value = idx
    // Записываем в стор для подсветки зоны на карте
    store.pendingAbility = { ...ability, slotIndex: idx, tokenUid: placed.value.uid }

    // Мгновенные способности (на себя / аура) — исполняем сразу
    if (isInstant.value) {
      executeAbility()
      activeSlot.value = null
    }
  }

  function slotIconStyle(ability) {
    if (!ability?.icon) return {}
    const url = `https://api.iconify.design/game-icons/${ability.icon}.svg`
    return {
      maskImage: `url('${url}')`,
      backgroundColor: ability.color || '#e2e8f0',
    }
  }

  // ── Горячие клавиши 1-6 для способностей ────────────────────────
  function onAbilityHotkey(e) {
    // Игнорируем, если фокус в текстовом поле
    const tag = e.target?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    const num = Number(e.key)
    if (num < 1 || num > SLOT_COUNT) return
    if (!placed.value) return

    onSlotClick(num - 1)
  }

  onMounted(() => document.addEventListener('keydown', onAbilityHotkey))
  onBeforeUnmount(() => document.removeEventListener('keydown', onAbilityHotkey))
</script>

<style scoped src="../assets/styles/components/gameAbilityBar.css"></style>

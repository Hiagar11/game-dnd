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

        <!-- Оффхенд (щит) через слэш-разделитель -->
        <template v-if="slotKey === activeWeaponSlot && offhand">
          <span class="ability-bar__weapon-slash">/</span>
          <div class="ability-bar__offhand-icon" :style="weaponIconStyle(offhand)" />
          <span class="ability-bar__offhand-name">{{ offhand.name }}</span>
        </template>
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
          'ability-bar__cell--rejected': rejectedSlot === idx,
        }"
        :title="slotTitle(slot, idx)"
        @mouseenter="onSlotHover(idx)"
        @focus="onSlotHover(idx)"
        @mouseleave="onSlotLeave"
        @blur="onSlotLeave"
        @click="onSlotClick(idx)"
      >
        <span v-if="slot" class="ability-bar__icon" :style="slotIconStyle(slot)" />
        <span v-if="slot" class="ability-bar__hotkey">{{ idx + 1 }}</span>
        <span
          v-if="slot && slot.apCost"
          class="ability-bar__cost"
          :class="{ 'ability-bar__cost--insufficient': hasInsufficientAp(slot) }"
        >
          {{ slot.apCost }}
        </span>
      </button>
    </div>

    <!-- Подсказка по выбранной способности -->
    <Transition name="ability-hint">
      <div v-if="hintAbility" class="ability-bar__hint">
        <span class="ability-bar__hint-name">{{ hintAbility.name }}</span>
        <span class="ability-bar__hint-desc">{{ hintAbility.description }}</span>
        <span class="ability-bar__hint-area"> Область: {{ hintAbility.areaLabel }} </span>
        <span v-if="hintAbilityProfile" class="ability-bar__hint-area">
          Тип: {{ getDeliveryLabel(hintAbilityProfile.delivery) }} /
          {{ getDamageKindLabel(hintAbilityProfile.damageKind) }}
        </span>
        <span v-if="hintAbilityLineOfSight" class="ability-bar__hint-area">
          {{ hintAbilityLineOfSight }}
        </span>
        <span v-if="hintDisabledReason" class="ability-bar__hint-warning">
          {{ hintDisabledReason }}
        </span>
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
  import { getActiveWeapon, hasShield } from '../utils/combatFormulas'
  import { getBaseActionPoints } from '../utils/actionPoints'
  import { getAbilityTreeById } from '../constants/abilityTree'
  import {
    getAbilityCombatProfile,
    getDeliveryLabel,
    getDamageKindLabel,
    getLineOfSightLabel,
  } from '../utils/abilityCombatProfile'

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

  const offhand = computed(() => placed.value?.inventory?.equipped?.offhand ?? null)

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
      const slot = raw[i] ?? null
      // Подтягиваем актуальные поля из abilityTree (requiresShield, areaType и др.)
      result.push(slot?.id ? (getAbilityTreeById(slot.id) ?? slot) : slot)
    }
    return result
  })

  const activeSlot = ref(null)
  const hoveredSlot = ref(null)
  const rejectedSlot = ref(null)
  let rejectedSlotTimeout = null

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

  const hoveredAbility = computed(() => {
    if (hoveredSlot.value == null) return null
    return slots.value[hoveredSlot.value] ?? null
  })

  const hintAbility = computed(() => activeAbility.value ?? hoveredAbility.value)

  const hintAbilityProfile = computed(() =>
    hintAbility.value ? getAbilityCombatProfile(hintAbility.value) : null
  )

  const hintAbilityLineOfSight = computed(() =>
    hintAbilityProfile.value ? getLineOfSightLabel(hintAbilityProfile.value) : null
  )

  const hintDisabledReason = computed(() => {
    if (!hintAbility.value) return ''
    return getAbilityDisabledReason(hintAbility.value)
  })

  function getAbilityDisabledReason(ability) {
    if (!ability || !placed.value) return ''

    if (ability.requiresMelee) {
      const weapon = getActiveWeapon(placed.value)
      if (!weapon || !MELEE_SLOTS.has(weapon.slot)) {
        return 'Требуется оружие ближнего боя'
      }
    }

    if (ability.requiresShield && !hasShield(placed.value)) {
      return 'Требуется щит в оффхэнде'
    }

    const currentAp = placed.value.actionPoints ?? 0
    const requiredAp = ability.apCost ?? 1

    if (ability.requiresFullActionPoints) {
      const fullActionPoints = getBaseActionPoints(placed.value) + (placed.value.bonusAp ?? 0)
      if (placed.value.spentActionPointsThisTurn) {
        return 'Доступно только до первой траты AP в этом ходу'
      }
      if (currentAp < fullActionPoints) {
        return `Нужны полные AP: ${currentAp}/${fullActionPoints}`
      }
    }

    if (currentAp < requiredAp) {
      return `Не хватает AP: нужно ${requiredAp}, доступно ${currentAp}`
    }

    return ''
  }

  function canUse(ability) {
    if (!placed.value) return true
    return !getAbilityDisabledReason(ability)
  }

  function hasInsufficientAp(ability) {
    if (!ability || !placed.value) return false
    return (placed.value.actionPoints ?? 0) < (ability.apCost ?? 1)
  }

  function slotTitle(slot, idx) {
    if (!slot) return `Ячейка ${idx + 1}`
    const reason = getAbilityDisabledReason(slot)
    return reason
      ? `${slot.name} (${slot.apCost} AP) — ${reason}`
      : `${slot.name} (${slot.apCost} AP)`
  }

  function onSlotHover(idx) {
    hoveredSlot.value = idx
  }

  function onSlotLeave() {
    hoveredSlot.value = null
  }

  function triggerRejectedSlot(idx) {
    rejectedSlot.value = idx
    if (rejectedSlotTimeout) clearTimeout(rejectedSlotTimeout)
    rejectedSlotTimeout = setTimeout(() => {
      rejectedSlot.value = null
      rejectedSlotTimeout = null
    }, 360)
  }

  function onSlotClick(idx) {
    const ability = slots.value[idx]
    if (!ability) return
    if (!canUse(ability)) {
      triggerRejectedSlot(idx)
      return
    }

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
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onAbilityHotkey)
    if (rejectedSlotTimeout) clearTimeout(rejectedSlotTimeout)
  })
</script>

<style scoped src="../assets/styles/components/gameAbilityBar.css"></style>

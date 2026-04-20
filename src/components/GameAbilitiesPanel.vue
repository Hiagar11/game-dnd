<template>
  <div class="abilities-panel">
    <!-- ─── Левая колонка: активные слоты (action bar) ────────────────── -->
    <div class="abilities-panel__active">
      <h3 class="abilities-panel__heading">Активные</h3>
      <div class="abilities-panel__grid">
        <div
          v-for="(slot, idx) in activeSlots"
          :key="'a' + idx"
          class="abilities-panel__cell"
          :class="{
            'abilities-panel__cell--empty': !slot,
            'abilities-panel__cell--drag-over': dragOverActive === idx,
          }"
          @dragover.prevent="onActiveDragOver(idx)"
          @dragleave="onActiveDragLeave"
          @drop.prevent="onActiveDrop(idx)"
          @click="slot && (selectedAbility = slot)"
        >
          <span v-if="slot" class="abilities-panel__icon" :style="abilityIconStyle(slot)" />
          <span v-if="slot" class="abilities-panel__cell-name">{{ slot.name }}</span>
          <span class="abilities-panel__cell-hotkey">{{ idx + 1 }}</span>
          <span v-if="slot?.apCost" class="abilities-panel__cell-cost">{{ slot.apCost }} AP</span>
        </div>
      </div>
    </div>

    <!-- ─── Правая колонка ───────────────────────────────────────────── -->
    <div class="abilities-panel__right">
      <!-- Пассивные слоты -->
      <div class="abilities-panel__passive">
        <h3 class="abilities-panel__heading">Пассивные</h3>
        <div class="abilities-panel__passive-grid">
          <div
            v-for="(slot, idx) in passiveSlots"
            :key="'p' + idx"
            class="abilities-panel__cell abilities-panel__cell--passive"
            :class="{
              'abilities-panel__cell--empty': !slot,
              'abilities-panel__cell--drag-over': dragOverPassive === idx,
            }"
            @dragover.prevent="onPassiveDragOver(idx)"
            @dragleave="onPassiveDragLeave"
            @drop.prevent="onPassiveDrop(idx)"
            @click="slot && (selectedAbility = slot)"
          >
            <span v-if="slot" class="abilities-panel__icon" :style="abilityIconStyle(slot)" />
            <span v-if="slot" class="abilities-panel__cell-name">{{ slot.name }}</span>
          </div>
        </div>
      </div>

      <!-- Список открытых способностей -->
      <div class="abilities-panel__library">
        <!-- Вкладки каталога -->
        <div class="abilities-panel__tabs">
          <button
            v-for="tab in catalogTabs"
            :key="tab.key"
            class="abilities-panel__tab"
            :class="{ 'abilities-panel__tab--active': activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span class="abilities-panel__tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <div v-if="filteredCatalog.length" class="abilities-panel__list">
          <div
            v-for="ability in filteredCatalog"
            :key="ability.id"
            class="abilities-panel__entry"
            :class="{
              'abilities-panel__entry--selected': selectedAbility?.id === ability.id,
              'abilities-panel__entry--passive': ability.type === 'passive',
            }"
            draggable="true"
            @dragstart="onAbilityDragStart($event, ability)"
            @click="selectedAbility = ability"
          >
            <span class="abilities-panel__entry-icon" :style="abilityIconStyle(ability)" />
            <div class="abilities-panel__entry-info">
              <span class="abilities-panel__entry-name">{{ ability.name }}</span>
              <span class="abilities-panel__entry-desc">{{ ability.description }}</span>
            </div>
            <span v-if="ability.apCost" class="abilities-panel__entry-cost"
              >{{ ability.apCost }} AP</span
            >
          </div>
        </div>
        <p v-else class="abilities-panel__empty">Нет способностей в этой категории</p>

        <!-- Детальное описание выбранной -->
        <Transition name="ability-detail">
          <div v-if="selectedAbility" class="abilities-panel__detail">
            <div class="abilities-panel__detail-header">
              <span
                class="abilities-panel__detail-icon"
                :style="abilityIconStyle(selectedAbility)"
              />
              <span class="abilities-panel__detail-name">{{ selectedAbility.name }}</span>
            </div>
            <p class="abilities-panel__detail-desc">{{ selectedAbility.description }}</p>
            <div class="abilities-panel__detail-tags">
              <span
                v-if="selectedAbility.apCost"
                class="abilities-panel__tag abilities-panel__tag--ap"
              >
                {{ selectedAbility.apCost }} AP
              </span>
              <span v-if="selectedAbility.areaLabel" class="abilities-panel__tag">
                {{ selectedAbility.areaLabel }}
              </span>
              <span
                v-if="selectedAbility.type === 'passive'"
                class="abilities-panel__tag abilities-panel__tag--passive"
              >
                Пассивная
              </span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { ABILITY_TARGET_MAP } from '../constants/abilityTree'

  const ACTIVE_COUNT = 6
  const PASSIVE_COUNT = 3

  const props = defineProps({
    abilities: { type: Array, default: () => [] },
    passives: { type: Array, default: () => [] },
    unlockedAbilities: { type: Array, default: () => [] },
  })
  const emit = defineEmits(['update:abilities', 'update:passives'])

  // Каталог = только развитые через дерево способности
  const fullCatalog = computed(() => props.unlockedAbilities)

  // ── Фильтры для вкладок ────────────────────────────────────────
  const target = (a) => ABILITY_TARGET_MAP[a.id]
  const isAoe = (a) => a.type === 'active' && target(a) === 'aoe'
  const isSingle = (a) => a.type === 'active' && target(a) === 'single'
  const isSpecial = (a) => a.type === 'active' && target(a) === 'self'
  const isPassive = (a) => a.type === 'passive'
  const isUtility = (a) => a.type === 'active' && target(a) === 'utility'

  const activeTab = ref('aoe')

  const catalogTabs = computed(() => [
    { key: 'aoe', label: 'По области', count: fullCatalog.value.filter(isAoe).length },
    { key: 'single', label: 'По цели', count: fullCatalog.value.filter(isSingle).length },
    { key: 'special', label: 'Специальное', count: fullCatalog.value.filter(isSpecial).length },
    { key: 'passive', label: 'Пассивные', count: fullCatalog.value.filter(isPassive).length },
    { key: 'utility', label: 'Мирные', count: fullCatalog.value.filter(isUtility).length },
  ])

  const filterMap = {
    aoe: isAoe,
    single: isSingle,
    special: isSpecial,
    passive: isPassive,
    utility: isUtility,
  }

  const filteredCatalog = computed(() => {
    const fn = filterMap[activeTab.value]
    return fn ? fullCatalog.value.filter(fn) : fullCatalog.value
  })

  const activeSlots = computed(() => {
    const result = []
    for (let i = 0; i < ACTIVE_COUNT; i++) result.push(props.abilities[i] ?? null)
    return result
  })

  const passiveSlots = computed(() => {
    const result = []
    for (let i = 0; i < PASSIVE_COUNT; i++) result.push(props.passives[i] ?? null)
    return result
  })

  const selectedAbility = ref(null)
  const dragOverActive = ref(null)
  const dragOverPassive = ref(null)
  let dragPayload = null

  function abilityIconStyle(ability) {
    if (!ability?.icon) return {}
    const url = `https://api.iconify.design/game-icons/${ability.icon}.svg`
    return { maskImage: `url('${url}')`, backgroundColor: ability.color || '#e2e8f0' }
  }

  // ── Drag from library ──────────────────────────────────────────
  function onAbilityDragStart(event, ability) {
    dragPayload = ability
    event.dataTransfer.effectAllowed = 'copy'
  }

  // ── Active slots drop ──────────────────────────────────────────
  function onActiveDragOver(idx) {
    dragOverActive.value = idx
  }
  function onActiveDragLeave() {
    dragOverActive.value = null
  }
  function onActiveDrop(idx) {
    dragOverActive.value = null
    if (!dragPayload || dragPayload.type === 'passive') return
    const next = [...activeSlots.value]
    next[idx] = dragPayload
    emit(
      'update:abilities',
      next.map((a) => a ?? undefined)
    )
    dragPayload = null
  }

  // ── Passive slots drop ─────────────────────────────────────────
  function onPassiveDragOver(idx) {
    dragOverPassive.value = idx
  }
  function onPassiveDragLeave() {
    dragOverPassive.value = null
  }
  function onPassiveDrop(idx) {
    dragOverPassive.value = null
    if (!dragPayload || dragPayload.type !== 'passive') return
    const next = [...passiveSlots.value]
    next[idx] = dragPayload
    emit(
      'update:passives',
      next.map((a) => a ?? undefined)
    )
    dragPayload = null
  }
</script>

<style scoped src="../assets/styles/components/gameAbilitiesPanel.css"></style>

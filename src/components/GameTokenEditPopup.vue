<template>
  <PopupShell :visible="visible" :aria-label="popupTitle" @close="onCancel">
    <h2 class="token-edit-popup__title">{{ popupTitle }}</h2>

    <!-- Табы — для placed-токена на карте и для шаблонов -->
    <div v-if="isEditMode || !isPlacedMode" class="token-edit-popup__tabs">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="token-edit-popup__tab"
        :class="{
          'token-edit-popup__tab--active': activeTab === tab.id,
          'token-edit-popup__tab--highlight': tab.id === 'tree' && hasNewAbilities,
        }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="13" weight="fill" />
        {{ tab.label }}
        <span v-if="tab.id === 'tree' && hasNewAbilities" class="token-edit-popup__tab-dot" />
      </button>
    </div>

    <div v-show="activeTab === 'stats'" class="token-edit-popup__body">
      <!-- Левая колонка: Карточка героя (1/4 ширины) -->
      <aside class="token-edit-popup__hero-card">
        <TokenPreviewPicker :src="previewSrc" :readonly="isEditMode" @file="onFile" />

        <div class="token-edit-popup__hero-hp">
          <div class="token-edit-popup__hero-hp-numbers">
            <PhHeart :size="18" weight="fill" class="token-edit-popup__hero-hp-icon" />
            <template v-if="isPlacedMode">
              <span class="token-edit-popup__hero-hp-current">{{ placedHp }}</span>
              <span class="token-edit-popup__hero-hp-sep">/</span>
              <span class="token-edit-popup__hero-hp-max">{{ placedMaxHp }}</span>
            </template>
            <template v-else>
              <span class="token-edit-popup__hero-hp-current">{{ formulaMaxHp }}</span>
            </template>
          </div>
          <div class="token-edit-popup__hero-hp-bar">
            <div
              class="token-edit-popup__hero-hp-fill"
              :style="{ width: isPlacedMode ? `${placedHpPercent}%` : '100%' }"
            />
          </div>
        </div>

        <div class="token-edit-popup__hero-level">
          <span class="token-edit-popup__hero-level-badge">Ур. {{ form.level ?? 1 }}</span>
          <span class="token-edit-popup__hero-xp">XP: {{ form.xp ?? 0 }}</span>
          <span v-if="(form.statPoints ?? 0) > 0" class="token-edit-popup__hero-stat-points">
            {{ form.statPoints }} очк.
          </span>
          <button
            type="button"
            class="token-edit-popup__level-up-btn"
            title="Поднять уровень (+1)"
            @click="onLevelUp"
          >
            ↑ Ур.
          </button>
        </div>

        <div
          class="token-edit-popup__hero-class"
          :class="{ 'token-edit-popup__hero-class--synergy': heroClassInfo.synergy }"
          :style="{ color: heroClassInfo.color }"
        >
          {{ heroClassInfo.name }}
        </div>
      </aside>

      <!-- Правая колонка: Все поля (3/4 ширины) -->
      <div class="token-edit-popup__fields">
        <!-- Имя + Раса — две колонки -->
        <div class="token-edit-popup__name-row">
          <label class="token-edit-popup__label">
            Имя
            <input
              v-model.trim="form.npcName"
              type="text"
              class="token-edit-popup__input"
              placeholder="Личное имя..."
              maxlength="40"
              @keydown.esc="onCancel"
            />
          </label>
          <label class="token-edit-popup__label">
            Раса
            <select v-model="form.race" class="token-edit-popup__input">
              <option value="">— нет —</option>
              <option v-for="r in RACES" :key="r.id" :value="r.id">{{ r.label }}</option>
            </select>
            <span v-if="raceHint" class="token-edit-popup__rc-hint">{{ raceHint }}</span>
          </label>
        </div>

        <!-- Отношение — видно только для шаблонов НПС (не для placed-редактирования) -->
        <label v-if="showAttitude" class="token-edit-popup__label">
          Отношение к героям
          <div class="token-edit-popup__attitude">
            <button
              v-for="opt in ATTITUDE_OPTIONS"
              :key="opt.value"
              type="button"
              class="token-edit-popup__attitude-btn"
              :class="{
                'token-edit-popup__attitude-btn--active': form.attitude === opt.value,
                [`token-edit-popup__attitude-btn--${opt.value}`]: true,
              }"
              @click="form.attitude = opt.value"
            >
              <span class="token-edit-popup__attitude-dot" />
              {{ opt.label }}
            </button>
          </div>
        </label>

        <!-- Авто-левелинг — только для NPC -->
        <label v-if="isNpcType && isPlacedMode" class="token-edit-popup__checkbox-row">
          <input v-model="form.autoLevel" type="checkbox" />
          Авто-левелинг (NPC подстраивается под уровень группы)
        </label>

        <TokenStatsGrid
          v-model="form"
          :inventory="inventoryModel"
          :passive-abilities="localPassives"
          :stat-points="form.statPoints ?? 0"
          @spend-point="onSpendPoint"
        />

        <!-- AI-подсказка после прокачки (одна загадка) -->
        <Transition name="hints-fade">
          <div
            v-if="abilityHints.hints.value.length || abilityHints.loading.value"
            class="token-edit-popup__hints"
          >
            <p v-if="abilityHints.loading.value" class="token-edit-popup__hints-loading">
              Оракул шепчет…
            </p>
            <p
              v-else-if="abilityHints.hints.value[0]"
              class="token-edit-popup__hint"
              @click="abilityHints.dismissHints()"
            >
              « {{ abilityHints.hints.value[0] }} »
            </p>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Панель: Инвентарь -->
    <div
      v-if="activeTab === 'inventory'"
      class="token-edit-popup__panel-inventory"
      @dragover.prevent
      @drop.prevent
    >
      <GameInventoryPanel
        v-model="inventoryModel"
        :generation-level="itemGenerationLevel"
        :owner-stats="ownerStatsForInventory"
        @drop-item="onDropItemToGround"
      />
    </div>

    <!-- Панель: Развитие (дерево способностей) -->
    <GameAbilityTreePanel
      v-if="activeTab === 'tree'"
      :stats="treeStats"
      :activated-ability-ids="treeActivatedIds"
      :activation-points="treeActivationPoints"
      @activate="onTreeActivate"
      @deactivate="onTreeDeactivate"
    />

    <!-- Панель: Способности -->
    <GameAbilitiesPanel
      v-if="activeTab === 'abilities'"
      :abilities="placedAbilities"
      :passives="placedPassives"
      :unlocked-abilities="placedUnlocked"
      @update:abilities="onAbilitiesUpdate"
      @update:passives="onPassivesUpdate"
    />

    <!-- Панель: Личность ИИ — только для НПС -->
    <div
      v-if="activeTab === 'personality' && isNpcType"
      class="token-edit-popup__panel-personality"
    >
      <div class="token-edit-popup__personality-header">
        <PhRobot :size="18" weight="duotone" class="token-edit-popup__personality-icon" />
        <span class="token-edit-popup__personality-title">Личность для ИИ-диалога</span>
      </div>

      <div class="token-edit-popup__personality-body">
        <!-- Левая колонка: textarea + счётчик -->
        <div class="token-edit-popup__personality-left">
          <textarea
            ref="personalityTextarea"
            v-model="form.personality"
            class="token-edit-popup__textarea"
            placeholder="Опиши характер, манеру речи, что знает персонаж..."
            maxlength="500"
          />
          <p class="token-edit-popup__personality-counter">{{ form.personality.length }} / 500</p>

          <label class="token-edit-popup__label token-edit-popup__label--notes">
            <span class="token-edit-popup__notes-heading">
              <PhLockKey :size="13" weight="duotone" />
              Секретные знания
              <span class="token-edit-popup__notes-hint"
                >(раскрываются при проверке убеждения)</span
              >
            </span>
            <textarea
              v-model="form.secretKnowledge"
              class="token-edit-popup__textarea token-edit-popup__textarea--notes"
              placeholder="Знает, что в подвале таверны спрятан артефакт..."
              maxlength="500"
            />
            <p class="token-edit-popup__personality-counter">
              {{ form.secretKnowledge.length }} / 500
            </p>
          </label>

          <label class="token-edit-popup__label token-edit-popup__label--notes">
            <span class="token-edit-popup__notes-heading">
              <PhNotebook :size="13" weight="duotone" />
              Память НПС
              <span class="token-edit-popup__notes-hint">(обновляется ИИ перед сохранением)</span>
            </span>
            <textarea
              v-model="form.contextNotes"
              class="token-edit-popup__textarea token-edit-popup__textarea--notes"
              placeholder="Итоги сессий, знакомства, обещания..."
              maxlength="800"
            />
            <p class="token-edit-popup__personality-counter">
              {{ form.contextNotes.length }} / 800
            </p>
          </label>
        </div>

        <!-- Правая колонка: группы тегов -->
        <div class="token-edit-popup__personality-tags">
          <div
            v-for="group in PERSONALITY_TAGS"
            :key="group.id"
            class="token-edit-popup__tag-group"
          >
            <p class="token-edit-popup__tag-group-label" :style="{ color: group.color }">
              {{ group.label }}
            </p>
            <div class="token-edit-popup__tag-row">
              <button
                v-for="tag in group.tags"
                :key="tag.phrase"
                type="button"
                class="token-edit-popup__tag"
                :class="{ 'token-edit-popup__tag--active': isTagActive(tag.phrase) }"
                :style="{ '--tag-color': group.color }"
                @click="toggleTag(tag.phrase)"
              >
                {{ tag.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="token-edit-popup__footer">
      <button
        v-if="isEditMode && activeTab === 'stats'"
        class="token-edit-popup__btn token-edit-popup__btn--delete"
        :disabled="saving"
        @mouseenter="playHover"
        @click="onDelete"
      >
        <PhTrash :size="15" />
        {{ isPlacedMode ? 'Убрать с карты' : 'Удалить' }}
      </button>
      <button
        class="token-edit-popup__btn token-edit-popup__btn--cancel"
        :disabled="saving"
        @mouseenter="playHover"
        @click="onCancel"
      >
        <PhX :size="15" />
        Отмена
      </button>
      <button
        v-if="activeTab === 'stats' || activeTab === 'personality' || isEditMode || !isPlacedMode"
        class="token-edit-popup__btn token-edit-popup__btn--save"
        :disabled="!canSave"
        @mouseenter="playHover"
        @click="onSave"
      >
        <span v-if="saving" class="token-edit-popup__spinner" />
        <template v-else>
          <PhFloppyDisk :size="15" />
          {{ isPlacedMode ? 'Сохранить' : isEditMode ? 'Сохранить шаблон' : 'Добавить' }}
        </template>
      </button>
    </div>
    <p v-if="saveError" class="token-edit-popup__save-error">{{ saveError }}</p>
  </PopupShell>
</template>

<script setup>
  import { ref, inject, computed, watch } from 'vue'
  import PopupShell from './PopupShell.vue'
  import TokenPreviewPicker from './TokenPreviewPicker.vue'
  import TokenStatsGrid from './TokenStatsGrid.vue'
  import GameInventoryPanel from './GameInventoryPanel.vue'
  import GameAbilitiesPanel from './GameAbilitiesPanel.vue'
  import GameAbilityTreePanel from './GameAbilityTreePanel.vue'
  import {
    PhTrash,
    PhX,
    PhFloppyDisk,
    PhHeart,
    PhRobot,
    PhNotebook,
    PhLockKey,
  } from '@phosphor-icons/vue'
  import { useTokenEditDeps } from '../composables/useTokenEditDeps'
  import { usePlacedInventorySync } from '../composables/usePlacedInventorySync'
  import { useTokenPersonalityEditorUi } from '../composables/useTokenPersonalityEditorUi'
  import { useTokenHpPreview } from '../composables/useTokenHpPreview'
  import { useTokenEditActions } from '../composables/useTokenEditActions'
  import { useTokenEditFormState } from '../composables/useTokenEditFormState'
  import { useTokenEditMode } from '../composables/useTokenEditMode'
  import { useTokenEditMeta } from '../composables/useTokenEditMeta'
  import { usePopupCursorBlock } from '../composables/usePopupCursorBlock'
  import { useTokenInventoryMeta } from '../composables/useTokenInventoryMeta'
  import { useTokenEditPreview } from '../composables/useTokenEditPreview'
  import { useAbilityHints } from '../composables/useAbilityHints'
  import { useAbilityTree } from '../composables/useAbilityTree'
  import { ATTITUDE_OPTIONS } from '../constants/attitudeOptions'
  import { PERSONALITY_TAGS } from '../constants/personalityTags'
  import { RACES } from '../constants/races'
  import { getRaceById } from '../constants/races'
  import { getAbilityTreeById, ABILITY_TREE } from '../constants/abilityTree'
  import { getHeroClass } from '../constants/heroClass'
  import { normalizePassiveAbilityEntries } from '../utils/passiveAbilities'

  // ── Дебаг-флаг: true = все способности открыты в каталоге ─────
  const DEBUG_ALL_ABILITIES = true
  import { xpForLevel } from '../utils/xpFormula'

  const props = defineProps({
    visible: { type: Boolean, required: true },
    tokenId: { type: [Number, String], default: null },
    placedUid: { type: String, default: null },
    // Дефолтное имя при создании (приходит из вкладки — NPC или Герой)
    defaultName: { type: String, default: '' },
    // 'npc' | 'hero' — сохраняется в БД при создании и не меняется
    tokenType: { type: String, default: 'npc' },
    // Дефолтное отношение — предзаполняется из вкладки чтобы новый токен сразу попадал в нужную
    defaultAttitude: { type: String, default: 'neutral' },
    // Таб, который будет активен при открытии ('stats' | 'inventory' | 'abilities' | 'personality')
    initialTab: { type: String, default: 'stats' },
  })

  const emit = defineEmits(['close'])

  const { store, tokensStore, getSocket, playHover, playClick } = useTokenEditDeps()
  const saving = ref(false)
  const saveError = ref('')
  const activeTab = ref('stats')

  // Блокировка курсора мастера у зрителей пока попап открыт.
  // inject(..., null) — безопасный fallback: если нет GameView-провайдера (напр. в редакторе) — ничего не делаем.
  const blockCursor = inject('blockCursor', null)
  const unblockCursor = inject('unblockCursor', null)
  usePopupCursorBlock({ props, activeTab, blockCursor, unblockCursor })

  const { isPlacedMode, isEditMode } = useTokenEditMode(props)

  const { form, inventoryModel, previewSrc, fileRef } = useTokenEditFormState({
    props,
    isPlacedMode,
    isEditMode,
    store,
    tokensStore,
    saveError,
  })
  const { ownerStatsForInventory, itemGenerationLevel } = useTokenInventoryMeta(form)

  const { personalityTextarea, isTagActive, toggleTag } = useTokenPersonalityEditorUi(form)

  const {
    isNpcType,
    tabs: TABS,
    popupTitle,
    showAttitude,
    canSave,
  } = useTokenEditMeta({
    props,
    isPlacedMode,
    isEditMode,
    saving,
    form,
    previewSrc,
  })

  usePlacedInventorySync({
    inventoryModel,
    props,
    isPlacedMode,
    store,
  })

  const { formulaMaxHp, placedHp, placedMaxHp, placedHpPercent } = useTokenHpPreview({
    form,
    isPlacedMode,
    store,
    props,
  })

  const { onFile, onCancel } = useTokenEditPreview({
    previewSrc,
    fileRef,
    playClick,
    emit,
  })

  // Локальные копии ability-данных — объявляем до useTokenEditActions
  const localTreeIds = ref([])
  const localAbilities = ref([])
  const localPassives = ref([])

  const { onSave, onDelete } = useTokenEditActions({
    canSave,
    playClick,
    saving,
    saveError,
    form,
    isPlacedMode,
    isEditMode,
    inventoryModel,
    store,
    props,
    getSocket,
    tokensStore,
    fileRef,
    emit,
    localTreeIds,
    localAbilities,
    localPassives,
  })

  function onDropItemToGround(item) {
    const token = store.placedTokens.find((t) => t.uid === props.placedUid)
    if (!token) return
    store.addGroundBag(token.col, token.row, item)
  }

  function onSpendPoint(statKey) {
    if ((form.value.statPoints ?? 0) <= 0) return
    form.value = {
      ...form.value,
      [statKey]: (form.value[statKey] ?? 0) + 1,
      statPoints: form.value.statPoints - 1,
    }
    // После распределения очка проверяем AI-подсказки
    abilityHints.checkAndFetchHints()
  }

  function onLevelUp() {
    const currentLevel = form.value.level ?? 1
    const nextLevel = currentLevel + 1
    form.value = {
      ...form.value,
      xp: xpForLevel(nextLevel),
      level: nextLevel,
      statPoints: (form.value.statPoints ?? 0) + 1,
    }
  }

  const raceHint = computed(() => getRaceById(form.value.race)?.hint ?? '')

  // Динамический класс персонажа на основе распределения характеристик
  const heroClassInfo = computed(() => getHeroClass(form.value, localTreeIds.value))

  // ── Ability tree tab data ────────────────────────────────────
  const currentPlaced = computed(() =>
    isPlacedMode.value ? store.placedTokens.find((t) => t.uid === props.placedUid) : null
  )

  // Инициализация локальных копий при открытии попапа
  watch(
    () => props.visible,
    (vis) => {
      if (!vis) return
      const token = currentPlaced.value
      localTreeIds.value = token?.treeActivatedIds ? [...token.treeActivatedIds] : []
      // Обновляем abilities из abilityTree — старые снапшоты могут не иметь новых полей
      localAbilities.value = (token?.abilities ?? []).map((slot) =>
        slot?.id ? (getAbilityTreeById(slot.id) ?? slot) : slot
      )
      localPassives.value = normalizePassiveAbilityEntries(
        token?.passiveAbilities ?? [],
        getAbilityTreeById
      )
    },
    { immediate: true }
  )

  const treeStats = computed(() => ({
    strength: form.value.strength ?? 1,
    agility: form.value.agility ?? 1,
    intellect: form.value.intellect ?? 1,
    charisma: form.value.charisma ?? 1,
  }))

  const treeActivatedIds = computed(() => localTreeIds.value)

  // AI-подсказки о почти открытых способностях
  const abilityHints = useAbilityHints(treeStats, treeActivatedIds)

  // Подсветка таба «Развитие», когда есть доступные способности
  const { availableAbilities } = useAbilityTree(treeStats, treeActivatedIds)
  // Зелёная подсветка гаснет при переходе на вкладку и появляется только при новых изменениях
  const treeSeenIds = ref(null)
  const hasNewAbilities = computed(() => {
    const ids = availableAbilities.value.map((a) => a.id).sort()
    if (treeSeenIds.value === null) return ids.length > 0
    if (ids.length === 0) return false
    return ids.join(',') !== treeSeenIds.value
  })

  watch(activeTab, (tab) => {
    if (tab === 'tree') {
      treeSeenIds.value = availableAbilities.value
        .map((a) => a.id)
        .sort()
        .join(',')
    }
  })

  // Очки активации = каждый нечётный уровень начиная с 3-го
  const treeActivationPoints = computed(() => {
    const lvl = form.value.level ?? 1
    if (lvl < 3) return 0
    return Math.floor((lvl - 1) / 2)
  })

  function onTreeActivate(abilityId) {
    if (!localTreeIds.value.includes(abilityId)) {
      localTreeIds.value = [...localTreeIds.value, abilityId]
    }

    // Автопереход на вкладку «Способности» после анимации покупки
    setTimeout(() => {
      activeTab.value = 'abilities'
    }, 750)
  }

  function onTreeDeactivate(abilityId) {
    // Каскадное снятие: удаляем способность и все синергии, которые от неё зависят
    const toRemove = new Set([abilityId])
    let changed = true
    while (changed) {
      changed = false
      for (const id of localTreeIds.value) {
        if (toRemove.has(id)) continue
        const ability = getAbilityTreeById(id)
        if (ability?.requiredAbilities.some((req) => toRemove.has(req))) {
          toRemove.add(id)
          changed = true
        }
      }
    }
    localTreeIds.value = localTreeIds.value.filter((id) => !toRemove.has(id))
    // Убираем из слотов способности, которые были деактивированы
    localAbilities.value = localAbilities.value.filter((a) => a && !toRemove.has(a.id))
    localPassives.value = localPassives.value.filter((a) => a && !toRemove.has(a.id))
  }

  // ── Abilities tab data ───────────────────────────────────────
  const placedAbilities = computed(() => localAbilities.value)
  const placedPassives = computed(() => localPassives.value)
  // Каталог способностей = все (дебаг) или только активированные в дереве
  const placedUnlocked = computed(() =>
    DEBUG_ALL_ABILITIES
      ? ABILITY_TREE
      : treeActivatedIds.value.map((id) => getAbilityTreeById(id)).filter(Boolean)
  )

  function onAbilitiesUpdate(next) {
    localAbilities.value = next.filter(Boolean)
  }

  function onPassivesUpdate(next) {
    localPassives.value = next.filter(Boolean)
  }
</script>

<style scoped lang="scss" src="../assets/styles/components/gameTokenEditPopup.scss"></style>

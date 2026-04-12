<template>
  <PopupShell :visible="visible" :aria-label="popupTitle" @close="onCancel">
    <h2 class="token-edit-popup__title">{{ popupTitle }}</h2>

    <!-- Табы — для placed-токена на карте и для шаблонов -->
    <div v-if="isEditMode || !isPlacedMode" class="token-edit-popup__tabs">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="token-edit-popup__tab"
        :class="{ 'token-edit-popup__tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="13" weight="fill" />
        {{ tab.label }}
      </button>
    </div>

    <div v-show="activeTab === 'stats'" class="token-edit-popup__body">
      <TokenPreviewPicker :src="previewSrc" :readonly="isEditMode" @file="onFile" />

      <div class="token-edit-popup__fields">
        <label class="token-edit-popup__label">
          Класс / Тип
          <input
            v-model.trim="form.name"
            type="text"
            class="token-edit-popup__input"
            placeholder="Например: Goblin"
            maxlength="40"
            @keydown.esc="onCancel"
          />
        </label>

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

        <TokenStatsGrid v-model="form" :inventory="inventoryModel" />

        <!-- Шкала здоровья -->
        <div class="token-edit-popup__hp">
          <div class="token-edit-popup__hp-header">
            <PhHeart :size="14" weight="fill" class="token-edit-popup__hp-icon" />
            <span class="token-edit-popup__hp-label">Здоровье</span>
            <span class="token-edit-popup__hp-value">
              <template v-if="isPlacedMode">
                <b>{{ placedHp }}</b> / {{ placedMaxHp }}
              </template>
              <template v-else> {{ formulaMaxHp }} (макс.) </template>
            </span>
          </div>
          <div class="token-edit-popup__hp-bar">
            <div
              class="token-edit-popup__hp-fill"
              :style="{ width: isPlacedMode ? `${placedHpPercent}%` : '100%' }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Панель: Инвентарь -->
    <div v-if="activeTab === 'inventory'" class="token-edit-popup__panel-inventory">
      <GameInventoryPanel
        v-model="inventoryModel"
        :generation-level="itemGenerationLevel"
        :owner-stats="ownerStatsForInventory"
      />
    </div>

    <!-- Панель: Способности -->
    <div v-if="activeTab === 'abilities'" class="token-edit-popup__panel-empty">
      <PhMagicWand :size="40" weight="duotone" class="token-edit-popup__panel-empty-icon" />
      <p class="token-edit-popup__panel-empty-text">Способности пока не реализованы</p>
      <p class="token-edit-popup__panel-empty-hint">Здесь будут активные и пассивные умения</p>
    </div>

    <!-- Панель: Личность ИИ — только для НПС -->
    <div
      v-if="activeTab === 'personality' && isNpcType"
      class="token-edit-popup__panel-personality"
    >
      <div class="token-edit-popup__personality-header">
        <PhRobot :size="18" weight="duotone" class="token-edit-popup__personality-icon" />
        <span class="token-edit-popup__personality-title">Личность для ИИ-диалога</span>
        <div class="token-edit-popup__personality-name">
          <input
            v-model.trim="form.npcName"
            type="text"
            class="token-edit-popup__input token-edit-popup__input--name"
            placeholder="Личное имя НПС..."
            maxlength="40"
          />
          <button
            type="button"
            class="token-edit-popup__random-btn"
            title="Случайное имя"
            @click="randomizeName"
          >
            <PhArrowsClockwise :size="14" weight="bold" />
          </button>
        </div>
      </div>

      <!-- Нрав: определяет пороги союзника/врага и скорость сближения -->
      <div class="token-edit-popup__disposition-row">
        <span class="token-edit-popup__disposition-label">Нрав</span>
        <div class="token-edit-popup__disposition-select-wrap">
          <select v-model="form.dispositionType" class="token-edit-popup__disposition-select">
            <option v-for="opt in DISPOSITION_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <span class="token-edit-popup__disposition-hint">{{ dispositionHint }}</span>
        </div>
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
        v-if="activeTab === 'stats' || activeTab === 'personality'"
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
  import { ref, inject } from 'vue'
  import PopupShell from './PopupShell.vue'
  import TokenPreviewPicker from './TokenPreviewPicker.vue'
  import TokenStatsGrid from './TokenStatsGrid.vue'
  import GameInventoryPanel from './GameInventoryPanel.vue'
  import {
    PhTrash,
    PhX,
    PhFloppyDisk,
    PhHeart,
    PhMagicWand,
    PhRobot,
    PhArrowsClockwise,
    PhNotebook,
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
  import { useDispositionHint } from '../composables/useDispositionHint'
  import { DISPOSITION_OPTIONS } from '../constants/dispositionConfig'
  import { ATTITUDE_OPTIONS } from '../constants/attitudeOptions'
  import { PERSONALITY_TAGS } from '../constants/personalityTags'

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

  const { personalityTextarea, randomizeName, isTagActive, toggleTag } =
    useTokenPersonalityEditorUi(form)

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
  const { dispositionHint } = useDispositionHint({ form, options: DISPOSITION_OPTIONS })

  usePlacedInventorySync({
    inventoryModel,
    props,
    isPlacedMode,
    store,
    getSocket,
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
  })
</script>

<style scoped lang="scss" src="../assets/styles/components/gameTokenEditPopup.scss"></style>

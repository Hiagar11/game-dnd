<template>
  <PopupShell :visible="visible" :aria-label="popupTitle" @close="onCancel">
    <h2 class="token-edit-popup__title">{{ popupTitle }}</h2>

    <div class="token-edit-popup__body">
      <TokenPreviewPicker :src="previewSrc" :readonly="isEditMode" @file="onFile" />

      <div class="token-edit-popup__fields">
        <label class="token-edit-popup__label">
          Название
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

        <TokenStatsGrid v-model="form" />
      </div>
    </div>

    <div class="token-edit-popup__footer">
      <button
        v-if="isEditMode"
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
  import { ref, computed, watch, inject } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useTokensStore } from '../stores/tokens'
  import PopupShell from './PopupShell.vue'
  import TokenPreviewPicker from './TokenPreviewPicker.vue'
  import TokenStatsGrid from './TokenStatsGrid.vue'
  import { PhTrash, PhX, PhFloppyDisk } from '@phosphor-icons/vue'
  import { useSocket } from '../composables/useSocket'
  import { useSound } from '../composables/useSound'

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
  })

  const emit = defineEmits(['close'])

  const store = useGameStore()
  const tokensStore = useTokensStore()
  const { getSocket } = useSocket()
  const { playHover, playClick } = useSound()
  const saving = ref(false)
  const saveError = ref('')

  // Блокировка курсора мастера у зрителей пока попап открыт.
  // inject(..., null) — безопасный fallback: если нет GameView-провайдера (напр. в редакторе) — ничего не делаем.
  const blockCursor = inject('blockCursor', null)
  const unblockCursor = inject('unblockCursor', null)

  watch(
    () => props.visible,
    (val) => {
      if (val) blockCursor?.()
      else unblockCursor?.()
    }
  )

  const isPlacedMode = computed(() => props.placedUid !== null)
  const isEditMode = computed(() => props.tokenId !== null || isPlacedMode.value)

  const popupTitle = computed(() =>
    isPlacedMode.value
      ? 'Токен на карте'
      : isEditMode.value
        ? 'Редактировать шаблон'
        : 'Добавить шаблон'
  )

  const DEFAULT_STATS = { strength: 0, agility: 0, intellect: 0, charisma: 0 }
  const form = ref({ name: '', attitude: 'neutral', ...DEFAULT_STATS })

  // Варианты отношения — видны только для НПС-шаблонов
  const ATTITUDE_OPTIONS = [
    { value: 'neutral', label: 'Нейтральное' },
    { value: 'friendly', label: 'Дружественное' },
    { value: 'hostile', label: 'Враждебное' },
  ]

  // Показывать selector для всех НПС — и шаблонов, и placed (но не для героев)
  const showAttitude = computed(() => props.tokenType === 'npc')
  const previewSrc = ref(null)
  const fileRef = ref(null)

  const canSave = computed(
    () =>
      !saving.value &&
      (isEditMode.value
        ? form.value.name.length > 0
        : form.value.name.length > 0 && previewSrc.value !== null)
  )

  watch(
    () => props.visible,
    (val) => {
      if (val) resetForm()
    }
  )

  function resetForm() {
    saveError.value = ''
    if (isPlacedMode.value) {
      const token = store.placedTokens.find((t) => t.uid === props.placedUid)
      if (token) {
        const { name, src, strength, agility, intellect, charisma, attitude } = token
        form.value = {
          name,
          attitude: attitude ?? 'neutral',
          strength,
          agility,
          intellect,
          charisma,
        }
        previewSrc.value = src
      }
    } else if (isEditMode.value) {
      const token = tokensStore.tokens.find((t) => t.id === props.tokenId)
      if (token) {
        const { name, src, strength, agility, intellect, charisma, attitude } = token
        form.value = {
          name,
          attitude: attitude ?? 'neutral',
          strength,
          agility,
          intellect,
          charisma,
        }
        previewSrc.value = src
      }
    } else {
      form.value = {
        name: props.defaultName,
        attitude: props.defaultAttitude ?? 'neutral',
        ...DEFAULT_STATS,
      }
      previewSrc.value = null
      fileRef.value = null
    }
  }

  function onFile(file) {
    if (previewSrc.value?.startsWith('blob:')) URL.revokeObjectURL(previewSrc.value)
    fileRef.value = file
    previewSrc.value = URL.createObjectURL(file)
  }

  async function onSave() {
    if (!canSave.value) return
    playClick()
    saving.value = true
    saveError.value = ''
    try {
      const { name, strength, agility, intellect, charisma } = form.value
      if (isPlacedMode.value) {
        store.editPlacedToken(props.placedUid, {
          name,
          attitude: form.value.attitude,
          strength,
          agility,
          intellect,
          charisma,
        })
      } else if (isEditMode.value) {
        await tokensStore.editToken(props.tokenId, {
          name,
          attitude: form.value.attitude,
          strength,
          agility,
          intellect,
          charisma,
        })
      } else {
        const fd = new FormData()
        fd.append('image', fileRef.value)
        fd.append('name', name)
        fd.append('tokenType', props.tokenType)
        fd.append('attitude', form.value.attitude)
        fd.append('strength', strength)
        fd.append('agility', agility)
        fd.append('intellect', intellect)
        fd.append('charisma', charisma)
        await tokensStore.addToken(fd)
      }
      emit('close')
    } catch (err) {
      saveError.value = err.message ?? 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  function onCancel() {
    playClick()
    if (previewSrc.value?.startsWith('blob:')) URL.revokeObjectURL(previewSrc.value)
    emit('close')
  }

  async function onDelete() {
    playClick()
    if (isPlacedMode.value) {
      if (!confirm(`Убрать токен «${form.value.name}» с карты?`)) return
      store.removeToken(props.placedUid)
      const scenarioId = String(store.currentScenario?.id ?? '')
      if (scenarioId) getSocket()?.emit('token:remove', { scenarioId, uid: props.placedUid })
      emit('close')
      return
    }
    if (!confirm(`Удалить токен «${form.value.name}»?`)) return
    saving.value = true
    try {
      await tokensStore.deleteToken(props.tokenId)
      emit('close')
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    } finally {
      saving.value = false
    }
  }
</script>

<style scoped lang="scss">
  .token-edit-popup__title {
    margin: 0;
    font-family: var(--font-base);
    font-size: 20px;
    font-weight: normal;
    color: var(--color-primary);
    text-align: center;
    letter-spacing: 0.05em;
  }

  .token-edit-popup__body {
    display: flex;
    gap: var(--space-6);
    align-items: flex-start;
  }

  .token-edit-popup__fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .token-edit-popup__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: 13px;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .token-edit-popup__input {
    @include form-input(rgb(255 255 255 / 6%), 14px);
  }

  // ─── Селектор отношения ────────────────────────────────────────────
  .token-edit-popup__attitude {
    display: flex;
    gap: var(--space-2);
  }

  .token-edit-popup__attitude-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid rgb(255 255 255 / 12%);
    background: rgb(255 255 255 / 4%);
    color: var(--color-text-muted);
    font-size: 12px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: rgb(255 255 255 / 25%);
      color: var(--color-text);
    }

    &--active.token-edit-popup__attitude-btn--neutral {
      border-color: rgb(156 163 175 / 70%);
      background: rgb(156 163 175 / 10%);
      color: rgb(156 163 175);
    }

    &--active.token-edit-popup__attitude-btn--friendly {
      border-color: rgb(74 222 128 / 70%);
      background: rgb(74 222 128 / 10%);
      color: rgb(74 222 128);
    }

    &--active.token-edit-popup__attitude-btn--hostile {
      border-color: rgb(248 113 113 / 70%);
      background: rgb(248 113 113 / 10%);
      color: rgb(248 113 113);
    }
  }

  .token-edit-popup__attitude-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    .token-edit-popup__attitude-btn--neutral & {
      background: rgb(156 163 175);
    }

    .token-edit-popup__attitude-btn--friendly & {
      background: rgb(74 222 128);
    }

    .token-edit-popup__attitude-btn--hostile & {
      background: rgb(248 113 113);
    }
  }

  .token-edit-popup__footer {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  .token-edit-popup__btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-6);
    font-size: 14px;

    &--cancel {
      @include btn-ghost;

      padding: var(--space-2) var(--space-6);
      font-size: 14px;

      // Менее акцентный hover: text-muted → text (не primary)
      &:hover {
        border-color: var(--color-text-muted);
        color: var(--color-text);
      }
    }

    &--save {
      @include btn-primary;

      padding: var(--space-2) var(--space-6);
      font-size: 14px;
    }

    &--delete {
      @include btn-danger;

      margin-right: auto;
      padding: var(--space-2) var(--space-6);
      font-size: 14px;
    }
  }

  .token-edit-popup__spinner {
    @include spinner(16px, $anim: token-spin, $light: false);
  }

  .token-edit-popup__save-error {
    margin-top: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: rgb(220 38 38 / 10%);
    border: 1px solid rgb(220 38 38 / 40%);
    color: var(--color-error);
    font-size: 13px;
    text-align: center;
  }

  @keyframes token-spin {
    to {
      transform: rotate(360deg);
    }
  }

  // Ширина попапа подстраивается под содержимое
  :deep(.popup-shell__box) {
    width: fit-content;
    max-width: 94vw;
  }
</style>

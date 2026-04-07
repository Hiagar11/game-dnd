<template>
  <PopupShell :visible="visible" aria-label="Сохранить прогресс" @close="$emit('skip')">
    <!-- Подтверждение перезаписи -->
    <template v-if="confirmOverwrite">
      <h2 class="game-save-popup__title">Перезаписать?</h2>
      <p class="game-save-popup__hint">
        Сохранение&nbsp;<strong>«{{ name }}»</strong>&nbsp;уже существует.<br />
        Старый прогресс будет утерян.
      </p>
      <p v-if="saveError" class="game-save-popup__error">{{ saveError }}</p>
      <div class="game-save-popup__footer">
        <button
          class="game-save-popup__btn game-save-popup__btn--skip"
          @mouseenter="playHover"
          @click="onCancelOverwrite"
        >
          Отмена
        </button>
        <button
          ref="confirmBtnRef"
          class="game-save-popup__btn game-save-popup__btn--danger"
          :disabled="saving"
          @mouseenter="playHover"
          @click="onConfirmOverwrite"
          @keydown.enter.prevent="onConfirmOverwrite"
        >
          <span v-if="saving" class="game-save-popup__spinner" />
          <span v-else>Перезаписать</span>
        </button>
      </div>
    </template>

    <!-- Основная форма -->
    <template v-else>
      <h2 class="game-save-popup__title">Сохранить прогресс?</h2>
      <p class="game-save-popup__hint">
        Введите имя — при следующем запуске сможете продолжить с этого места.
      </p>

      <label class="game-save-popup__label">
        Название сохранения
        <input
          ref="inputRef"
          v-model.trim="name"
          type="text"
          class="game-save-popup__input"
          placeholder="Например: Поход в замок"
          maxlength="80"
          @keydown.enter="onSave"
          @keydown.esc="$emit('skip')"
        />
      </label>

      <p v-if="saveError" class="game-save-popup__error">{{ saveError }}</p>

      <div class="game-save-popup__footer">
        <button
          class="game-save-popup__btn game-save-popup__btn--skip"
          @mouseenter="playHover"
          @click="onSkip"
        >
          Не сохранять
        </button>
        <button
          class="game-save-popup__btn game-save-popup__btn--save"
          :disabled="!name || saving"
          @mouseenter="playHover"
          @click="onSave"
        >
          <span v-if="saving" class="game-save-popup__spinner" />
          <span v-else>Сохранить</span>
        </button>
      </div>
    </template>
  </PopupShell>
</template>

<script setup>
  import { ref, watch, nextTick } from 'vue'
  import PopupShell from './PopupShell.vue'
  import { useSound } from '../composables/useSound'

  const props = defineProps({
    visible: { type: Boolean, required: true },
    // Имя, которым предзаполняется поле (обычно название кампании)
    defaultName: { type: String, default: '' },
    // Имена уже существующих сессий — для проверки перезаписи
    existingNames: { type: Array, default: () => [] },
  })

  const emit = defineEmits(['save', 'skip'])

  const { playHover, playClick } = useSound()

  const inputRef = ref(null)
  const confirmBtnRef = ref(null)
  const name = ref('')
  const saving = ref(false)
  const saveError = ref('')
  const confirmOverwrite = ref(false)

  // При открытии — сбрасываем поле и фокусируемся
  watch(
    () => props.visible,
    (val) => {
      if (val) {
        name.value = props.defaultName
        saveError.value = ''
        saving.value = false
        confirmOverwrite.value = false
        nextTick(() => inputRef.value?.focus())
      }
    }
  )

  // При переключении на экран подтверждения — фокусируем кнопку, чтобы Enter срабатывал
  watch(confirmOverwrite, (val) => {
    if (val) nextTick(() => confirmBtnRef.value?.focus())
  })

  // emit('save', name) — родитель сам делает запрос, управляет saving через prop
  async function onSave() {
    if (!name.value || saving.value) return
    playClick()
    // Имя совпадает с существующим — показываем экран подтверждения
    if (props.existingNames.includes(name.value)) {
      confirmOverwrite.value = true
      return
    }
    await doSave()
  }

  async function onConfirmOverwrite() {
    if (saving.value) return
    playClick()
    await doSave()
  }

  function onCancelOverwrite() {
    playClick()
    confirmOverwrite.value = false
    saveError.value = ''
  }

  async function doSave() {
    saving.value = true
    saveError.value = ''
    try {
      await new Promise((resolve, reject) => {
        emit('save', name.value, { resolve, reject })
      })
    } catch (err) {
      saveError.value = err?.message ?? 'Ошибка при сохранении'
      saving.value = false
    }
  }
  function onSkip() {
    playClick()
    emit('skip')
  }
</script>

<style scoped lang="scss">
  .game-save-popup__title {
    margin: 0;
    font-family: var(--font-base);
    font-size: 20px;
    font-weight: normal;
    color: var(--color-primary);
    text-align: center;
    letter-spacing: 0.05em;
  }

  .game-save-popup__hint {
    margin: 0;
    font-size: 13px;
    color: var(--color-text-muted);
    text-align: center;
    line-height: 1.5;
  }

  .game-save-popup__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .game-save-popup__input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--color-overlay);
    border: 1px solid rgb(255 255 255 / 20%);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: 15px;
    outline: none;
    transition: border-color var(--transition-fast);
    box-sizing: border-box;

    &:focus {
      border-color: var(--color-primary);
    }
  }

  .game-save-popup__error {
    margin: 0;
    font-size: 12px;
    color: var(--color-danger, #e55);
    text-align: center;
  }

  .game-save-popup__footer {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  .game-save-popup__btn {
    font-size: 14px;

    &--skip {
      @include btn-ghost;

      padding: var(--space-2) var(--space-5);
      font-size: 14px;
    }

    &--save {
      @include btn-primary;

      padding: var(--space-2) var(--space-5);
      font-size: 14px;
      min-width: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &--danger {
      @include btn-danger;

      padding: var(--space-2) var(--space-5);
      font-size: 14px;
      min-width: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .game-save-popup__spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgb(0 0 0 / 30%);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

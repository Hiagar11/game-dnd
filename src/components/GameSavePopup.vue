<template>
  <PopupShell :visible="visible" aria-label="Сохранить прогресс" @close="$emit('skip')">
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
    defaultName: { type: String, default: '' },
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

  watch(confirmOverwrite, (val) => {
    if (val) nextTick(() => confirmBtnRef.value?.focus())
  })

  async function onSave() {
    if (!name.value || saving.value) return
    playClick()
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

<style scoped lang="scss" src="../assets/styles/components/gameSavePopup.scss"></style>

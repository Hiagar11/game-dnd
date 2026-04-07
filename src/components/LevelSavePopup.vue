<template>
  <PopupShell :visible="visible" aria-label="Сохранение уровня" @close="$emit('close')">
    <h3 class="save-popup__title">Сохранить уровень</h3>
    <div class="save-popup__body">
      <p class="save-popup__hint">Название сохранения</p>
      <input
        ref="inputRef"
        :value="modelValue"
        class="save-popup__input"
        type="text"
        maxlength="80"
        placeholder="Например: Встреча в таверне"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown.enter="$emit('save')"
        @keydown.esc="$emit('close')"
      />
      <p v-if="error" class="save-popup__error">{{ error }}</p>
    </div>
    <div class="save-popup__actions">
      <button class="save-popup__cancel" @mouseenter="playHover" @click="onClose">Отмена</button>
      <button
        class="save-popup__confirm"
        :disabled="saving || !modelValue"
        @mouseenter="playHover"
        @click="onConfirm"
      >
        {{ saving ? 'Сохраняю…' : 'Сохранить' }}
      </button>
    </div>
  </PopupShell>
</template>

<script setup>
  import { ref, watch, nextTick } from 'vue'
  import { useSound } from '../composables/useSound'
  import PopupShell from './PopupShell.vue'

  const props = defineProps({
    visible: { type: Boolean, required: true },
    modelValue: { type: String, default: '' },
    saving: { type: Boolean, default: false },
    error: { type: String, default: '' },
  })

  const emit = defineEmits(['update:modelValue', 'save', 'close'])

  const { playHover, playClick } = useSound()

  function onClose() {
    playClick()
    emit('close')
  }

  function onConfirm() {
    playClick()
    emit('save')
  }

  const inputRef = ref(null)

  watch(
    () => props.visible,
    (val) => {
      if (val) nextTick(() => inputRef.value?.focus())
    }
  )
</script>

<style scoped lang="scss">
  .save-popup__title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }

  .save-popup__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .save-popup__hint {
    @include field-label;

    margin: 0;
  }

  .save-popup__input {
    @include form-input($font-size: 14px);
  }

  .save-popup__error {
    @include text-error;

    margin: 0;
  }

  .save-popup__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .save-popup__cancel {
    @include btn-ghost;

    padding: var(--space-2) var(--space-4);
    font-size: 13px;
  }

  .save-popup__confirm {
    @include btn-primary;

    padding: var(--space-2) var(--space-4);
    font-size: 13px;
  }
</style>

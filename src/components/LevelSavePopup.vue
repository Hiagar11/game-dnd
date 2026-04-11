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
      <p class="save-popup__hint save-popup__hint--location">
        Описание локации для НПС
        <span class="save-popup__hint-note">(необязательно)</span>
      </p>
      <textarea
        class="save-popup__textarea"
        :value="locationDescription"
        placeholder="Таверна в городе Нейвен, вечер, шумная толпа..."
        maxlength="600"
        rows="3"
        @input="$emit('update:locationDescription', $event.target.value)"
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
    locationDescription: { type: String, default: '' },
    saving: { type: Boolean, default: false },
    error: { type: String, default: '' },
  })

  const emit = defineEmits(['update:modelValue', 'update:locationDescription', 'save', 'close'])

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

  .save-popup__hint--location {
    margin-top: var(--space-2);
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .save-popup__hint-note {
    opacity: 0.5;
    font-size: 11px;
  }

  .save-popup__textarea {
    @include form-input($font-size: 13px);

    resize: none;
    line-height: 1.5;
    font-family: var(--font-ui);
    width: 100%;
    box-sizing: border-box;
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

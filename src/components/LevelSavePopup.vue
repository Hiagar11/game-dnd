<template>
  <div v-if="visible" class="save-popup-overlay" @click.self="$emit('close')">
    <div class="save-popup">
      <h3 class="save-popup__title">Сохранить уровень</h3>
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
      <div class="save-popup__actions">
        <button class="save-popup__cancel" @click="$emit('close')">Отмена</button>
        <button
          class="save-popup__confirm"
          :disabled="saving || !modelValue"
          @click="$emit('save')"
        >
          {{ saving ? 'Сохраняю…' : 'Сохранить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, nextTick } from 'vue'

  const props = defineProps({
    visible: { type: Boolean, required: true },
    modelValue: { type: String, default: '' },
    saving: { type: Boolean, default: false },
    error: { type: String, default: '' },
  })

  defineEmits(['update:modelValue', 'save', 'close'])

  const inputRef = ref(null)

  watch(
    () => props.visible,
    (val) => {
      if (val) nextTick(() => inputRef.value?.focus())
    }
  )
</script>

<style scoped lang="scss">
  .save-popup-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-popup);
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 60%);
    backdrop-filter: blur(4px);
  }

  .save-popup {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 360px;
    padding: var(--space-6);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(18 18 22 / 95%);
  }

  .save-popup__title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
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
    margin-block-start: var(--space-1);
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

    &:disabled {
      opacity: 0.5;
    }
  }
</style>

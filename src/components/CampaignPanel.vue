<template>
  <div class="campaign-panel">
    <div class="campaign-panel__header">Сценарии</div>

    <div class="campaign-panel__list">
      <button
        v-for="c in campaigns"
        :key="c.id"
        class="campaign-panel__item"
        :class="{ 'campaign-panel__item--active': activeCampaignId === c.id }"
        @mouseenter="playHover"
        @click="onSelect(c)"
      >
        {{ c.name }}
      </button>
      <p v-if="!campaigns.length && !loading" class="campaign-panel__empty">
        Нет сохранённых сценариев
      </p>
    </div>

    <div class="campaign-panel__footer">
      <input
        :value="campaignName"
        class="campaign-panel__input"
        type="text"
        placeholder="Название сценария"
        maxlength="80"
        @input="$emit('update:campaignName', $event.target.value)"
        @keydown.enter="$emit('save')"
      />
      <button
        class="campaign-panel__btn"
        :disabled="!campaignName || saving"
        @mouseenter="playHover"
        @click="onSave"
      >
        {{ saving ? 'Сохраняю…' : activeCampaignId ? 'Обновить' : 'Сохранить' }}
      </button>
      <div v-if="activeCampaignId" class="campaign-panel__actions">
        <button
          class="campaign-panel__btn campaign-panel__btn--secondary"
          @mouseenter="playHover"
          @click="onReset"
        >
          Новый
        </button>
        <button
          class="campaign-panel__btn campaign-panel__btn--danger"
          :disabled="saving"
          @mouseenter="playHover"
          @click="onDelete"
        >
          Удалить
        </button>
      </div>
      <p v-if="saveSuccess" class="campaign-panel__success">✔ Сохранено</p>
      <p v-if="saveError" class="campaign-panel__error">{{ saveError }}</p>
    </div>
  </div>
</template>

<script setup>
  import { useSound } from '../composables/useSound'

  defineProps({
    campaigns: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    activeCampaignId: { type: [String, Number], default: null },
    campaignName: { type: String, required: true },
    saving: { type: Boolean, default: false },
    saveSuccess: { type: Boolean, default: false },
    saveError: { type: String, default: '' },
  })

  const emit = defineEmits(['select', 'update:campaignName', 'save', 'reset', 'delete'])

  const { playHover, playClick } = useSound()

  function onSelect(c) {
    emit('select', c)
    playClick()
  }

  function onSave() {
    emit('save')
    playClick()
  }

  function onReset() {
    emit('reset')
    playClick()
  }

  function onDelete() {
    emit('delete')
    playClick()
  }
</script>

<style scoped lang="scss">
  .campaign-panel {
    width: 210px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-6);
    background: rgb(0 0 0 / 50%);
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
  }

  .campaign-panel__header {
    @include field-label;
  }

  .campaign-panel__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
  }

  .campaign-panel__item {
    width: 100%;
    text-align: left;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: 13px;
    cursor: pointer;
    transition: background var(--transition-fast);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background: rgb(255 255 255 / 6%);
    }

    &--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .campaign-panel__empty {
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: center;
    padding: var(--space-4) 0;
  }

  .campaign-panel__footer {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-block-start: var(--space-4);
    border-block-start: 1px solid var(--color-border);
  }

  .campaign-panel__input {
    @include form-input(rgb(255 255 255 / 5%));

    width: 100%;
    box-sizing: border-box;
  }

  .campaign-panel__btn {
    @include btn-outline;

    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: 13px;

    &--secondary {
      border-color: var(--color-border);
      color: var(--color-text-muted);
    }

    &--danger {
      @include btn-danger;

      width: 100%;
      padding: var(--space-2) var(--space-3);
      font-size: 13px;
    }
  }

  .campaign-panel__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .campaign-panel__success {
    @include text-success;

    text-align: center;
  }

  .campaign-panel__error {
    @include text-error;

    text-align: center;
  }
</style>

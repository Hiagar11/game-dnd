<template>
  <PopupShell :visible="visible" aria-label="Итог сессии — память НПС" @close="$emit('skip')">
    <h2 class="summary-popup__title">
      <PhBookOpen :size="18" weight="duotone" />
      Итог сессии
    </h2>
    <p class="summary-popup__hint">
      ИИ подготовил краткую запись взаимодействий с НПС. Отредактируйте при необходимости и
      сохраните — следующая сессия начнётся с этим контекстом.
    </p>

    <div class="summary-popup__list">
      <div v-for="npc in localNpcs" :key="npc.npcUid" class="summary-popup__card">
        <!-- Аватар + инфо -->
        <div class="summary-popup__card-header">
          <div class="summary-popup__avatar">
            <img v-if="npc.src" :src="npc.src" :alt="npc.name" class="summary-popup__avatar-img" />
            <PhUser v-else :size="20" weight="duotone" class="summary-popup__avatar-icon" />
          </div>
          <div class="summary-popup__card-meta">
            <span class="summary-popup__card-name">{{ npc.name }}</span>
            <span class="summary-popup__badge" :class="`summary-popup__badge--${npc.attitude}`">{{
              ATTITUDE_LABELS[npc.attitude] ?? npc.attitude
            }}</span>
          </div>
        </div>

        <textarea
          v-model="npc.notes"
          class="summary-popup__textarea"
          placeholder="Описание взаимодействия..."
          maxlength="800"
        />
        <p class="summary-popup__counter">{{ npc.notes.length }} / 800</p>
      </div>
    </div>

    <div class="summary-popup__footer">
      <button class="summary-popup__btn summary-popup__btn--skip" @click="$emit('skip')">
        <PhArrowRight :size="14" />
        Пропустить
      </button>
      <button
        class="summary-popup__btn summary-popup__btn--save"
        :disabled="saving"
        @click="onSave"
      >
        <span v-if="saving" class="summary-popup__spinner" />
        <template v-else>
          <PhFloppyDisk :size="14" />
          Сохранить память
        </template>
      </button>
    </div>
  </PopupShell>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { PhBookOpen, PhUser, PhFloppyDisk, PhArrowRight } from '@phosphor-icons/vue'
  import PopupShell from './PopupShell.vue'

  const props = defineProps({
    visible: { type: Boolean, required: true },
    // Каждый элемент: { npcUid, tokenId, name, attitude, summary, src? }
    npcs: { type: Array, default: () => [] },
  })

  const emit = defineEmits(['save', 'skip'])

  const ATTITUDE_LABELS = { neutral: 'Нейтрален', friendly: 'Дружественен', hostile: 'Враждебен' }

  // Локальная копия с редактируемым полем notes (заполняется из AI summary)
  const localNpcs = ref([])
  const saving = ref(false)

  watch(
    () => props.npcs,
    (list) => {
      localNpcs.value = list.map((n) => ({ ...n, notes: n.summary ?? '' }))
    },
    { immediate: true }
  )

  async function onSave() {
    saving.value = true
    try {
      // Передаём только тех, у кого есть tokenId
      emit(
        'save',
        localNpcs.value.filter((n) => n.tokenId).map(({ tokenId, notes }) => ({ tokenId, notes }))
      )
    } finally {
      saving.value = false
    }
  }
</script>

<style scoped lang="scss">
  .summary-popup__title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0 0 var(--space-2);
    font-family: var(--font-base);
    font-size: 20px;
    font-weight: normal;
    color: var(--color-primary);
  }

  .summary-popup__hint {
    margin: 0 0 var(--space-4);
    font-size: 12px;
    font-family: var(--font-ui);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .summary-popup__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-height: 55vh;
    overflow-y: auto;
    padding-right: var(--space-1);
    margin-bottom: var(--space-4);
  }

  .summary-popup__card {
    background: rgb(255 255 255 / 4%);
    border: 1px solid rgb(255 255 255 / 8%);
    border-radius: var(--radius-md, 8px);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .summary-popup__card-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .summary-popup__avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    background: rgb(255 255 255 / 8%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .summary-popup__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .summary-popup__avatar-icon {
    color: var(--color-text-muted);
  }

  .summary-popup__card-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .summary-popup__card-name {
    font-size: 14px;
    font-family: var(--font-base);
    color: var(--color-text);
  }

  .summary-popup__badge {
    display: inline-block;
    font-size: 10px;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 2px 6px;
    border-radius: 999px;

    &--neutral {
      background: rgb(148 163 184 / 20%);
      color: #94a3b8;
    }

    &--friendly {
      background: rgb(74 222 128 / 15%);
      color: #4ade80;
    }

    &--hostile {
      background: rgb(248 113 113 / 15%);
      color: #f87171;
    }
  }

  .summary-popup__textarea {
    @include form-input(rgb(255 255 255 / 6%), 13px);

    resize: none;
    height: 90px;
    line-height: 1.6;
    font-family: var(--font-ui);
    width: 100%;
    box-sizing: border-box;
  }

  .summary-popup__counter {
    margin: 0;
    font-size: 11px;
    font-family: var(--font-ui);
    color: rgb(255 255 255 / 25%);
    text-align: right;
  }

  .summary-popup__footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
  }

  .summary-popup__btn {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-4);
    border: none;
    border-radius: var(--radius-sm, 6px);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: opacity 0.15s;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &--skip {
      background: transparent;
      color: var(--color-text-muted);
      border: 1px solid rgb(255 255 255 / 12%);

      &:hover:not(:disabled) {
        color: var(--color-text);
      }
    }

    &--save {
      background: var(--color-primary);
      color: #000;

      &:hover:not(:disabled) {
        opacity: 0.85;
      }
    }
  }

  .summary-popup__spinner {
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

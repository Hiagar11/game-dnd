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
    npcs: { type: Array, default: () => [] },
  })

  const emit = defineEmits(['save', 'skip'])

  const ATTITUDE_LABELS = { neutral: 'Нейтрален', friendly: 'Дружественен', hostile: 'Враждебен' }

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
      emit(
        'save',
        localNpcs.value.filter((n) => n.tokenId).map(({ tokenId, notes }) => ({ tokenId, notes }))
      )
    } finally {
      saving.value = false
    }
  }
</script>

<style scoped lang="scss" src="../assets/styles/components/gameSessionSummaryPopup.scss"></style>

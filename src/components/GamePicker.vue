<template>
  <div class="game-picker">
    <router-link class="game-picker__back" :to="{ name: 'menu' }">← Меню</router-link>

    <template v-if="sessions.length">
      <h2 class="game-picker__title">Продолжить</h2>
      <div class="game-picker__grid">
        <div
          v-for="session in sessions"
          :key="session.id ?? session._id"
          class="game-card game-card--session"
        >
          <div class="game-card__campaign-icon">📜</div>
          <p class="game-card__name">{{ session.name }}</p>
          <p class="game-card__meta">{{ session.campaignName }}</p>
          <p class="game-card__meta game-card__meta--sub">{{ session.currentScenarioName }}</p>
          <div class="game-card__session-actions">
            <button
              class="game-card__btn game-card__btn--continue"
              :disabled="loadingId === (session.id ?? session._id)"
              @mouseenter="playHover"
              @click="emit('resume-session', session)"
            >
              <span v-if="loadingId === (session.id ?? session._id)">Загрузка…</span>
              <span v-else>▶ Играть</span>
            </button>
            <button
              class="game-card__btn game-card__btn--delete"
              title="Удалить сохранение"
              @mouseenter="playHover"
              @click="emit('delete-session', session)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      <div class="game-picker__divider" />
    </template>

    <h2 class="game-picker__title">Начать новый</h2>
    <p v-if="loading" class="game-picker__hint">Загрузка…</p>
    <p v-else-if="!campaigns.length" class="game-picker__hint">
      Нет сценариев. Мастер должен создать сценарий в редакторе.
    </p>
    <div v-else class="game-picker__grid">
      <button
        v-for="c in campaigns"
        :key="c.id"
        class="game-card"
        :disabled="loadingId === c.id"
        @mouseenter="playHover"
        @click="emit('select-campaign', c)"
      >
        <div class="game-card__campaign-icon">🗺️</div>
        <p class="game-card__name">{{ c.name }}</p>
        <p class="game-card__meta">{{ levelCount(c) }} карт</p>
        <span v-if="loadingId === c.id" class="game-card__loading">Загрузка…</span>
      </button>
    </div>

    <p v-if="error" class="game-picker__error">{{ error }}</p>
  </div>
</template>

<script setup>
  import { useSound } from '../composables/useSound'
  import { useScenariosStore } from '../stores/scenarios'

  defineProps({
    campaigns: { type: Array, default: () => [] },
    sessions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    loadingId: { type: [String, Number], default: null },
    error: { type: String, default: '' },
  })

  const emit = defineEmits(['select-campaign', 'resume-session', 'delete-session'])

  const { playHover } = useSound()
  const scenariosStore = useScenariosStore()

  function levelCount(campaign) {
    const nodeIds = new Set(campaign.nodes.map((n) => String(n.scenarioId)))
    return scenariosStore.scenarios.filter((s) => s.tokensCount > 0 && nodeIds.has(String(s.id)))
      .length
  }
</script>

<style scoped lang="scss" src="../assets/styles/components/gamePicker.scss"></style>

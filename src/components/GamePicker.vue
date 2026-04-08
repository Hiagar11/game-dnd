<!--
  GamePicker — экран выбора кампании и продолжения сохранённых сессий.
  Вынесен из GameView, чтобы тот не смешивал логику выбора с логикой игрового поля.

  Получает данные через props, действия проксирует через emit:
    select-campaign(campaign)   — мастер выбрал кампанию для новой игры
    resume-session(session)     — мастер хочет продолжить сохранение
    delete-session(session)     — мастер удаляет сохранение
-->
<template>
  <div class="game-picker">
    <router-link class="game-picker__back" :to="{ name: 'menu' }">← Меню</router-link>

    <!-- ── Продолжить сохранённую игру ──────────────────────────────────────── -->
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

    <!-- ── Начать новый ──────────────────────────────────────────────────────── -->
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

  // Количество готовых уровней в кампании
  function levelCount(campaign) {
    const nodeIds = new Set(campaign.nodes.map((n) => String(n.scenarioId)))
    return scenariosStore.scenarios.filter((s) => s.tokensCount > 0 && nodeIds.has(String(s.id)))
      .length
  }
</script>

<style scoped lang="scss">
  .game-picker {
    position: relative;
    z-index: 1;
    height: 100%;
    overflow-y: auto;
    padding: var(--space-6) var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .game-picker__back {
    align-self: flex-start;
    font-size: 13px;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-primary);
    }
  }

  .game-picker__title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .game-picker__hint {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .game-picker__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-4);
  }

  .game-picker__error {
    font-size: 13px;
    color: var(--color-error);
  }

  .game-picker__divider {
    height: 1px;
    background: rgb(255 255 255 / 10%);
    margin: var(--space-2) 0;
  }

  /* ── Карточка ────────────────────────────────────────────────────────────── */
  .game-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 40%);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: rgb(255 255 255 / 5%);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.6;
    }
  }

  .game-card__campaign-icon {
    font-size: 40px;
    padding: var(--space-6) 0 var(--space-2);
    text-align: center;
  }

  .game-card__name {
    color: var(--color-text);
    padding: var(--space-2) var(--space-3);
    font-size: 13px;
    text-align: left;
    font-weight: 500;
  }

  .game-card__meta {
    padding: 0 var(--space-3) var(--space-2);
    font-size: 11px;
    color: var(--color-text-muted);
    text-align: left;
  }

  .game-card__meta--sub {
    font-size: 10px;
    opacity: 0.65;
    padding-top: 0;
  }

  .game-card__loading {
    display: block;
    padding: var(--space-1) var(--space-3) var(--space-2);
    font-size: 11px;
    color: var(--color-text-muted);
  }

  /* ── Сохранённая сессия ──────────────────────────────────────────────────── */
  .game-card--session {
    cursor: default;
    border-color: rgb(255 255 255 / 20%);

    &:hover {
      border-color: var(--color-primary);
    }
  }

  .game-card__session-actions {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3) var(--space-3);
    margin-top: auto;
  }

  .game-card__btn {
    font-size: 12px;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: default;
    }

    &--continue {
      @include btn-primary;

      flex: 1;
      padding: var(--space-1) var(--space-3);
      font-size: 12px;
    }

    &--delete {
      @include btn-danger;

      padding: var(--space-1) var(--space-2);
      font-size: 12px;
    }
  }
</style>

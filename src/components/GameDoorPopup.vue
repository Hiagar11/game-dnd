<template>
  <Teleport to="body">
    <Transition name="popup-fade">
      <div v-if="visible" class="door-overlay" @click.self="$emit('close')">
        <div class="door-popup" role="dialog" aria-modal="true" aria-label="Настройка двери">
          <h2 class="door-popup__title">Дверь</h2>

          <div class="door-popup__selects">
            <!-- Левый: текущая локация — всегда задизейблен -->
            <div class="door-popup__select-wrap">
              <label class="door-popup__label">Текущая локация</label>
              <select class="door-popup__select door-popup__select--disabled" disabled>
                <option>{{ currentName }}</option>
              </select>
            </div>

            <span class="door-popup__arrow">→</span>

            <!-- Правый: выбор целевой локации -->
            <div class="door-popup__select-wrap">
              <label class="door-popup__label">Переход в</label>
              <select v-model="targetId" class="door-popup__select">
                <option value="" disabled>— Выберите локацию —</option>
                <option v-for="level in otherLevels" :key="level.id" :value="level.id">
                  {{ level.name || 'Без названия' }}
                </option>
              </select>
            </div>
          </div>

          <div class="door-popup__footer">
            <button class="door-popup__btn door-popup__btn--cancel" @click="$emit('close')">
              Отмена
            </button>
            <button
              class="door-popup__btn door-popup__btn--save"
              :disabled="!targetId"
              @click="onApply"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useScenariosStore } from '../stores/scenarios'
  import { useCampaignsStore } from '../stores/campaigns'

  const props = defineProps({
    visible: { type: Boolean, required: true },
    // uid размещённого токена-двери — нужен для сохранения связи
    placedUid: { type: String, default: null },
  })

  const emit = defineEmits(['close'])

  const gameStore = useGameStore()
  const scenariosStore = useScenariosStore()
  const campaignsStore = useCampaignsStore()

  // Название текущей локации
  const currentName = computed(() => gameStore.currentScenario?.name || 'Текущая локация')

  // Доступные для перехода локации:
  // если активна кампания — показываем только связанные боком мапа;
  // иначе — все заполненные карты кроме текущей.
  const otherLevels = computed(() => {
    const currentId = String(gameStore.currentScenario?.id ?? '')
    const campaign = gameStore.activeCampaign

    const all = scenariosStore.scenarios.filter(
      (s) => s.tokensCount > 0 && String(s.id) !== currentId
    )

    if (campaign) {
      const connectedIds = campaignsStore.getConnectedIds(campaign, currentId)
      // Если кампания есть но связей нет — отображаем все как запасной вариант
      if (connectedIds.length) {
        return all.filter((s) => connectedIds.includes(String(s.id)))
      }
    }
    return all
  })

  const targetId = ref('')

  // При открытии: заполняем уже сохранённый targetScenarioId, если есть
  watch(
    () => props.visible,
    (val) => {
      if (val) {
        const placed = gameStore.placedTokens.find((t) => t.uid === props.placedUid)
        targetId.value = placed?.targetScenarioId ?? ''
      }
    }
  )

  function onApply() {
    gameStore.setDoorTarget(props.placedUid, targetId.value)
    emit('close')
  }
</script>

<style scoped>
  .door-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-popup, 300);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-overlay-strong);
    backdrop-filter: blur(2px);
  }

  .door-popup {
    width: min(480px, 90vw);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-8);
    background: var(--color-surface);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-lg);
    box-shadow:
      0 8px 32px rgb(0 0 0 / 70%),
      0 0 16px var(--color-primary-glow);
  }

  .door-popup__title {
    margin: 0;
    font-family: var(--font-base);
    font-size: 20px;
    font-weight: normal;
    color: var(--color-primary);
    text-align: center;
    letter-spacing: 0.05em;
  }

  .door-popup__selects {
    display: flex;
    align-items: flex-end;
    gap: var(--space-4);
  }

  .door-popup__select-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .door-popup__arrow {
    font-size: 20px;
    color: var(--color-primary);
    padding-bottom: 8px;
    flex-shrink: 0;
  }

  .door-popup__label {
    font-size: 12px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .door-popup__select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: rgb(255 255 255 / 6%);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: 14px;
    cursor: pointer;
    outline: none;
    transition: border-color var(--transition-fast);

    &:focus {
      border-color: var(--color-primary-bright, var(--color-primary));
    }

    /* Стили option — ограничены браузером, но убираем системный фон */
    option {
      background: var(--color-surface);
      color: var(--color-text);
    }

    &--disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  .door-popup__footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
  }

  .door-popup__btn {
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 14px;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    &--cancel {
      background: rgb(255 255 255 / 6%);
      border-color: rgb(255 255 255 / 15%);
      color: var(--color-text);

      &:hover {
        background: rgb(255 255 255 / 12%);
      }
    }

    &--save {
      background: var(--color-primary);
      color: var(--color-bg, #000);
      font-weight: 600;

      &:hover:not(:disabled) {
        filter: brightness(1.15);
      }

      &:disabled {
        opacity: 0.35;
        cursor: default;
      }
    }
  }

  /* Повторное использование анимации из GameTokenEditPopup */
  .popup-fade-enter-active,
  .popup-fade-leave-active {
    transition: opacity 0.15s ease;
  }

  .popup-fade-enter-from,
  .popup-fade-leave-to {
    opacity: 0;
  }
</style>

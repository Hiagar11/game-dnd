<template>
  <PopupShell :visible="visible" aria-label="Настройка двери" @close="$emit('close')">
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
          <!-- Выход в глобальную карту (если есть ребро сценарий → глобальная карта) -->
          <option v-if="hasGlobalExit" value="__globalMap__">🌍 Выход в глобальную карту</option>
        </select>
      </div>
    </div>

    <div class="door-popup__footer">
      <button
        class="door-popup__btn door-popup__btn--cancel"
        @mouseenter="playHover"
        @click="onClose"
      >
        Отмена
      </button>
      <button
        class="door-popup__btn door-popup__btn--save"
        :disabled="!targetId"
        @mouseenter="playHover"
        @click="onApply"
      >
        Применить
      </button>
    </div>
  </PopupShell>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useScenariosStore } from '../stores/scenarios'
  import { useCampaignsStore } from '../stores/campaigns'
  import PopupShell from './PopupShell.vue'
  import { useSound } from '../composables/useSound'
  import { getCurrentScenarioId } from '../utils/scenario'

  const props = defineProps({
    visible: { type: Boolean, required: true },
    // uid размещённого токена-двери — нужен для сохранения связи
    placedUid: { type: String, default: null },
  })

  const emit = defineEmits(['close'])

  const gameStore = useGameStore()
  const scenariosStore = useScenariosStore()
  const campaignsStore = useCampaignsStore()
  const { playHover, playClick } = useSound()

  function onClose() {
    playClick()
    emit('close')
  }

  // Название текущей локации
  const currentName = computed(() => gameStore.currentScenario?.name || 'Текущая локация')

  // Есть ли у текущего сценария ребро к глобальной карте
  const hasGlobalExit = computed(() => {
    const currentId = getCurrentScenarioId(gameStore)
    const campaign = gameStore.activeCampaign
    return campaignsStore.hasGlobalMapEdge(campaign, currentId)
  })

  // Доступные для перехода локации:
  // если активна кампания — показываем только связанные боком мапа;
  // иначе — все заполненные карты кроме текущей.
  const otherLevels = computed(() => {
    const currentId = getCurrentScenarioId(gameStore)
    const campaign = gameStore.activeCampaign

    const all = scenariosStore.scenarios.filter(
      (s) => s.tokensCount > 0 && String(s.id) !== currentId
    )

    if (campaign) {
      const connectedIds = campaignsStore.getConnectedIds(campaign, currentId)
      // Если есть хотя бы одна связь (локальная или глобальная) — показываем только связанные.
      // Если единственная связь — глобальная карта, connectedIds будет пуст → список локаций пуст.
      if (campaignsStore.hasAnyEdge(campaign, currentId)) {
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
        // Если дверь ведёт на глобальную карту — показываем соответствующий пункт
        targetId.value = placed?.globalMapExit ? '__globalMap__' : (placed?.targetScenarioId ?? '')
      }
    }
  )

  function onApply() {
    playClick()
    if (targetId.value === '__globalMap__') {
      // Дверь ведёт на глобальную карту — устанавливаем флаг, сбрасываем targetScenarioId
      gameStore.setDoorGlobalMapExit(props.placedUid, true)
    } else {
      // Обычная дверь — сбрасываем globalMapExit, устанавливаем targetScenarioId
      gameStore.setDoorGlobalMapExit(props.placedUid, false)
      gameStore.setDoorTarget(props.placedUid, targetId.value)
    }
    emit('close')
  }
</script>

<style scoped lang="scss">
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
    @include field-label;
  }

  .door-popup__select {
    @include form-input(rgb(255 255 255 / 6%), 14px);

    width: 100%;
    border-color: var(--color-primary);
    cursor: pointer;

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
      @include btn-ghost;

      padding: var(--space-2) var(--space-6);
      font-size: 14px;
    }

    &--save {
      @include btn-primary;

      padding: var(--space-2) var(--space-6);
      font-size: 14px;

      &:hover:not(:disabled) {
        filter: brightness(1.15);
        background: var(--color-primary);
        border-color: var(--color-primary);
      }
    }
  }
</style>

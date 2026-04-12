import { computed } from 'vue'
import { PhBackpack, PhMagicWand, PhRobot, PhScroll } from '@phosphor-icons/vue'

export function useTokenEditMeta({ props, isPlacedMode, isEditMode, saving, form, previewSrc }) {
  const isNpcType = computed(() => props.tokenType === 'npc')

  const popupTitle = computed(() =>
    isPlacedMode.value
      ? 'Токен на карте'
      : isEditMode.value
        ? 'Редактировать шаблон'
        : 'Добавить шаблон'
  )

  const tabs = computed(() => [
    { id: 'stats', label: 'Характеристики', icon: PhScroll },
    { id: 'inventory', label: 'Инвентарь', icon: PhBackpack },
    { id: 'abilities', label: 'Способности', icon: PhMagicWand },
    ...(isNpcType.value ? [{ id: 'personality', label: 'Личность ИИ', icon: PhRobot }] : []),
  ])

  const showAttitude = computed(() => isNpcType.value)

  const canSave = computed(
    () =>
      !saving.value &&
      (isEditMode.value
        ? form.value.name.length > 0
        : form.value.name.length > 0 && previewSrc.value !== null)
  )

  return {
    isNpcType,
    tabs,
    popupTitle,
    showAttitude,
    canSave,
  }
}

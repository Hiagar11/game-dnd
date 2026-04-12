import { computed } from 'vue'
import { calcMaxHp } from '../utils/combatFormulas'

export function useTokenHpPreview({ form, isPlacedMode, store, props }) {
  const formulaMaxHp = computed(() => calcMaxHp(form.value.strength ?? 0, form.value.agility ?? 0))

  const placedToken = computed(() =>
    isPlacedMode.value ? store.placedTokens.find((token) => token.uid === props.placedUid) : null
  )

  const placedHp = computed(() => placedToken.value?.hp ?? formulaMaxHp.value)
  const placedMaxHp = computed(() => placedToken.value?.maxHp ?? formulaMaxHp.value)

  const placedHpPercent = computed(() =>
    placedMaxHp.value > 0
      ? Math.max(0, Math.min(100, (placedHp.value / placedMaxHp.value) * 100))
      : 100
  )

  return {
    formulaMaxHp,
    placedHp,
    placedMaxHp,
    placedHpPercent,
  }
}

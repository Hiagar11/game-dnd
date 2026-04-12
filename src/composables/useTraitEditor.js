import { computed, ref } from 'vue'
import { DEFAULT_TRAIT_FORM, TRAIT_CATEGORIES, TRAIT_STATS } from '../constants/traitEditorOptions'

function createDefaultForm() {
  return {
    ...DEFAULT_TRAIT_FORM,
    mods: DEFAULT_TRAIT_FORM.mods.map((mod) => ({ ...mod })),
  }
}

export function useTraitEditor(store) {
  const form = ref(createDefaultForm())
  const filterCategory = ref(null)
  const filterOptions = [{ value: null, label: 'Все' }, ...TRAIT_CATEGORIES]

  const labelForCategory = (category) =>
    TRAIT_CATEGORIES.find((entry) => entry.value === category)?.label ?? category

  const labelForStat = (stat) => TRAIT_STATS.find((entry) => entry.value === stat)?.label ?? stat

  const gameIconUrl = (slug) => `https://api.iconify.design/game-icons/${slug}.svg`

  const addMod = () => {
    form.value.mods.push({ stat: '', value: 0 })
  }

  const removeMod = (idx) => {
    form.value.mods.splice(idx, 1)
  }

  const filteredTraits = computed(() => {
    if (!filterCategory.value) return store.traits
    return store.traits.filter((trait) => trait.category === filterCategory.value)
  })

  const onSubmit = () => {
    store.addTrait({ ...form.value })
    form.value = createDefaultForm()
  }

  return {
    form,
    filterCategory,
    filterOptions,
    filteredTraits,
    labelForCategory,
    labelForStat,
    gameIconUrl,
    addMod,
    removeMod,
    onSubmit,
  }
}

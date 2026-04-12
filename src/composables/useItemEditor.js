import { computed, ref } from 'vue'
import { DEFAULT_ITEM_FORM, ITEM_CATEGORIES } from '../constants/itemEditorOptions'

function createDefaultForm() {
  return {
    ...DEFAULT_ITEM_FORM,
    traitIds: [...DEFAULT_ITEM_FORM.traitIds],
  }
}

export function useItemEditor({ itemsStore, traitsStore }) {
  const form = ref(createDefaultForm())
  const filterCategory = ref(null)
  const filterOptions = [{ value: null, label: 'Все' }, ...ITEM_CATEGORIES]

  const filteredItems = computed(() => {
    if (filterCategory.value === null) return itemsStore.items
    return itemsStore.items.filter((item) => (item.category ?? 'other') === filterCategory.value)
  })

  const gameIconUrl = (slug) => `https://api.iconify.design/game-icons/${slug}.svg`

  const traitById = (id) => traitsStore.traits.find((trait) => trait.id === id)

  const toggleTrait = (id) => {
    const idx = form.value.traitIds.indexOf(id)
    if (idx === -1) {
      form.value.traitIds.push(id)
    } else {
      form.value.traitIds.splice(idx, 1)
    }
  }

  const onSubmit = () => {
    itemsStore.addItem({ ...form.value, traitIds: [...form.value.traitIds] })
    form.value = createDefaultForm()
  }

  return {
    form,
    filterCategory,
    filterOptions,
    filteredItems,
    gameIconUrl,
    traitById,
    toggleTrait,
    onSubmit,
  }
}

// Хранилище героев — токены с tokenType === 'hero', видимые зрителям в меню.
// На стороне МАСТЕРА этот стор не используется — там тип хранится в tokensStore.
// На стороне ЗРИТЕЛЯ этот стор заполняется через socket 'game:heroes:updated'
// и читается компонентом ViewerMenu.
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useHeroesStore = defineStore('heroes', () => {
  // Полные данные героев — те же поля, что у элементов tokensStore.tokens.
  // { id, name, tokenType, src, strength, agility, intellect, charisma }
  const heroes = ref([])

  // Заменяем весь список — используется при получении состояния от сервера.
  function setHeroes(list) {
    heroes.value = list ?? []
  }

  return { heroes, setHeroes }
})

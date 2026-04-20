# Copilot Instructions — game-dnd

## Стек

MEVN: MongoDB + Express + Vue 3 (Composition API, Pinia) + Node.js. Socket.io, Vite, SCSS.

## Язык

- Комментарии в коде — на русском
- Переменные, функции, классы — на английском
- Commit messages — на английском (Conventional Commits)

## Vue

- Только `<script setup>` + Composition API
- Бизнес-логика — в `stores/` (Pinia) и `composables/`
- Компоненты — только UI-отображение
- Composables начинаются с `use` (например `useTokenMove.js`)
- Props через `defineProps`, events через `defineEmits`
- Не использовать Options API, mixins, this

## CSS/SCSS

- BEM-именование: `.block__element--modifier`
- `<style lang="scss" scoped>` в SFC
- Тяжёлые стили выносить в `src/assets/styles/components/*.scss` через `<style scoped src="...">`
- Использовать CSS-переменные из `_variables.scss` (--color-_, --space-_, --token-size)
- Использовать миксины из `_mixins.scss` (menu-panel-content, btn-ghost, btn-primary и др.)

## Файлы

- Компоненты Vue — PascalCase: `GameTokens.vue`
- Composables — camelCase с `use`: `useTokenMove.js`
- Stores — camelCase: `game.js`, `tokens.js`
- Константы — camelCase файл, UPPER_SNAKE_CASE экспорт

## Backend

- Express routes в `server/routes/`
- Mongoose модели в `server/models/`
- Всегда валидировать ObjectId
- `parseStat()` для числовых полей (защита от NaN/Infinity)
- Проверять `owner` на всех modifying роутах

## Безопасность

- Никаких `v-html` с непроверенными данными
- Не хранить секреты в коде
- Валидация на границах системы (API endpoints)

## Качество

- `npm run check` должен проходить (lint + lint:css + lint:html + test:run + build)
- index.html — html-validate формат (void tags без `/>`)
- Не превышать ~250 строк на SFC — декомпозировать в composables

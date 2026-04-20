---
description: 'Исправить все ошибки npm run check'
mode: 'agent'
---

Запусти `npm run check` и исправь все найденные ошибки:

1. `npm run lint` — ESLint ошибки в src/
2. `npm run lint:css` — Stylelint ошибки в SCSS/CSS
3. `npm run lint:html` — html-validate ошибки в index.html
4. `npm run test:run` — падающие тесты
5. `npm run build` — ошибки сборки Vite

Исправляй итеративно: запусти → почини → запусти снова, пока всё не станет зелёным.

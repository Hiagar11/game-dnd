// ESLint — инструмент, который проверяет код на ошибки и плохие практики.
// Это "flat config" — новый формат конфига начиная с ESLint 9.

import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  // Стандартные рекомендуемые правила для JavaScript
  js.configs.recommended,

  // Рекомендуемые правила для Vue-файлов (.vue)
  // "flat/recommended" — это версия правил для нового формата конфига
  ...pluginVue.configs['flat/recommended'],

  // Отключаем правила ESLint, которые конфликтуют с Prettier.
  // Prettier будет отвечать за форматирование, ESLint — только за ошибки.
  prettierConfig,

  {
    // Применяем эти настройки только к .js и .vue файлам фронтенда
    files: ['src/**/*.{js,vue}'],

    languageOptions: {
      // globals.browser — полный список всех браузерных API: window, document,
      // Audio, Image, fetch, localStorage, setTimeout, requestAnimationFrame и т.д.
      // Теперь не нужно добавлять каждую переменную вручную.
      globals: {
        ...globals.browser,
      },
    },

    rules: {
      // Здесь можно добавлять свои правила.
      // Например: 'no-console': 'warn' — предупреждать о console.log в коде.
    },
  },

  {
    // Настройки для серверных файлов (Node.js окружение, а не браузерное)
    files: ['server/**/*.js'],
    languageOptions: {
      // globals.node — process, Buffer, __filename, __dirname, setTimeout и др.
      globals: {
        ...globals.node,
      },
    },
  },
]

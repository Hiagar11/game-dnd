import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: {
        // Позволяет писать @use 'mixins' as * без указания пути в каждом файле
        loadPaths: [path.resolve(__dirname, 'src/assets/styles')],
        // Автоматически добавляет импорт примесей в начало каждого SCSS-блока.
        // Исключение: сам файл _mixins.scss (избегаем самоимпорта).
        additionalData(content, filepath) {
          if (/_mixins\.scss$/.test(filepath)) return content
          return `@use 'mixins' as *;\n${content}`
        },
      },
    },
  },
})

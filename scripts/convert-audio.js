// Скрипт конвертации тяжёлых WAV-файлов в MP3 перед сборкой.
// Запускается автоматически через "prebuild" в package.json.
//
// Конвертируются ТОЛЬКО музыкальные треки — UI-звуки (hover, click и т.д.)
// суммарно < 200 КБ и конвертации не требуют.
//
// Логика "если уже есть — пропустить" избегает лишней работы при повторных сборках.

import { spawnSync } from 'child_process'
import { existsSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import ffmpegPath from 'ffmpeg-static'

const __dirname = dirname(fileURLToPath(import.meta.url))
const soundsDir = resolve(__dirname, '../public/sounds')

// Файлы для конвертации: [исходный WAV, результирующий MP3, битрейт]
const tasks = [
  ['main-menu.wav', 'main-menu.mp3', '128k'],
  ['travel.wav', 'travel.mp3', '128k'],
  ['battle.wav', 'battle.mp3', '128k'],
  ['combat2.wav', 'combat2.mp3', '128k'],
]

let converted = 0
let skipped = 0

for (const [src, dest, bitrate] of tasks) {
  const srcPath = resolve(soundsDir, src)
  const destPath = resolve(soundsDir, dest)

  if (!existsSync(srcPath)) {
    console.warn(`[audio] пропуск: ${src} не найден`)
    skipped++
    continue
  }

  // Пропускаем если MP3 новее WAV (уже конвертировано)
  if (existsSync(destPath)) {
    const srcMtime = statSync(srcPath).mtimeMs
    const destMtime = statSync(destPath).mtimeMs
    if (destMtime >= srcMtime) {
      console.log(`[audio] актуален: ${dest}`)
      skipped++
      continue
    }
  }

  console.log(`[audio] конвертирую ${src} → ${dest} (${bitrate})...`)

  const result = spawnSync(
    ffmpegPath,
    [
      '-y', // перезаписать без вопросов
      '-i',
      srcPath,
      '-b:a',
      bitrate,
      '-map_metadata',
      '-1', // убрать метаданные — незначительно уменьшает размер
      destPath,
    ],
    { stdio: 'inherit' }
  )

  if (result.status !== 0) {
    console.error(`[audio] ошибка конвертации ${src}`)
    process.exit(1)
  }

  const sizeMB = (statSync(destPath).size / 1024 / 1024).toFixed(1)
  console.log(`[audio] готово: ${dest} (${sizeMB} МБ)`)
  converted++
}

console.log(`[audio] итог: сконвертировано ${converted}, пропущено ${skipped}`)

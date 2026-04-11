// Composable — это обычная JS-функция, название начинается с "use" (соглашение Vue).
// Она содержит логику, которую можно переиспользовать в разных компонентах.
// Этот composable отвечает за воспроизведение звуков интерфейса.

// Объекты Audio создаются ОДИН РАЗ на уровне модуля (singleton).
// Если создавать их внутри useSound(), при каждом вызове (а он есть в ~15 компонентах)
// мы получили бы ~30 лишних Audio-объектов в памяти.
const hoverSound = new Audio('/sounds/hover.wav')
const clickSound = new Audio('/sounds/click.wav')
const nextSound = new Audio('/sounds/next.wav')
const successSound = new Audio('/sounds/success.wav')
const fistSound = new Audio('/sounds/fist.wav')
const battleMusic = new Audio('/sounds/battle.mp3')
const travelMusic = new Audio('/sounds/travel.mp3')
const mainMenuMusic = new Audio('/sounds/main-menu.mp3')

// volume: от 0 (тихо) до 1 (максимум)
hoverSound.volume = 0.3
clickSound.volume = 0.5
nextSound.volume = 0.6
successSound.volume = 0.7
fistSound.volume = 0.8
battleMusic.volume = 0
battleMusic.loop = true
travelMusic.volume = 0
travelMusic.loop = true
mainMenuMusic.volume = 0
mainMenuMusic.loop = true

// Универсальный фейдер для любого Audio-объекта
function fadeAudio(audio, targetVol, durationMs, onDone) {
  const steps = 40
  const stepTime = durationMs / steps
  const startVol = audio.volume
  const delta = (targetVol - startVol) / steps
  let step = 0
  const id = setInterval(() => {
    step++
    audio.volume = Math.max(0, Math.min(1, startVol + delta * step))
    if (step >= steps) {
      clearInterval(id)
      onDone?.()
    }
  }, stepTime)
  return id
}

// ── Боевая музыка ─────────────────────────────────────────────────────────────
let battleFadeId = null

export function playBattleMusic() {
  if (battleFadeId) clearInterval(battleFadeId)
  if (battleMusic.paused) {
    battleMusic.volume = 0
    battleMusic.currentTime = 0
    battleMusic.play().catch(() => {})
  }
  battleFadeId = fadeAudio(battleMusic, 0.45, 2500, () => {
    battleFadeId = null
  })
}

export function stopBattleMusic() {
  if (battleFadeId) clearInterval(battleFadeId)
  battleFadeId = fadeAudio(battleMusic, 0, 1500, () => {
    battleMusic.pause()
    battleFadeId = null
  })
}

// ── Мирная музыка ─────────────────────────────────────────────────────────────
let travelFadeId = null

export function playTravelMusic() {
  if (travelFadeId) clearInterval(travelFadeId)
  if (travelMusic.paused) {
    travelMusic.volume = 0
    travelMusic.currentTime = 0
    travelMusic.play().catch(() => {})
  }
  travelFadeId = fadeAudio(travelMusic, 0.4, 2500, () => {
    travelFadeId = null
  })
}

export function stopTravelMusic() {
  if (travelFadeId) clearInterval(travelFadeId)
  travelFadeId = fadeAudio(travelMusic, 0, 1500, () => {
    travelMusic.pause()
    travelFadeId = null
  })
}

// ── Звук успеха ───────────────────────────────────────────────────────────────
export function playSuccess() {
  successSound.currentTime = 0
  successSound.play().catch(() => {})
}
export function playFist() {
  fistSound.currentTime = 0
  fistSound.play().catch(() => {})
} // ── Музыка главного меню ─────────────────────────────────────────
let menuFadeId = null

export function playMainMenuMusic() {
  if (menuFadeId) clearInterval(menuFadeId)
  if (mainMenuMusic.paused) {
    mainMenuMusic.volume = 0
    mainMenuMusic.currentTime = 0
    mainMenuMusic.play().catch(() => {})
  }
  menuFadeId = fadeAudio(mainMenuMusic, 0.4, 2000, () => {
    menuFadeId = null
  })
}

export function stopMainMenuMusic() {
  if (menuFadeId) clearInterval(menuFadeId)
  menuFadeId = fadeAudio(mainMenuMusic, 0, 1500, () => {
    mainMenuMusic.pause()
    menuFadeId = null
  })
}
export function useSound() {
  function playHover() {
    // currentTime = 0 — перематываем в начало перед каждым воспроизведением.
    // Без этого звук не сыграет повторно, пока не закончился предыдущий.
    hoverSound.currentTime = 0
    // .catch(() => {}) — браузер блокирует play() до первого взаимодействия пользователя.
    // Это политика автовоспроизведения (Autoplay Policy). Просто игнорируем ошибку —
    // звук не сыграет при первом наведении, но дальше всё будет работать.
    hoverSound.play().catch(() => {})
  }

  function playClick() {
    clickSound.currentTime = 0
    clickSound.play().catch(() => {})
  }

  function playNext() {
    nextSound.currentTime = 0
    nextSound.play().catch(() => {})
  }

  // Возвращаем только то, что нужно компоненту — принцип минимального интерфейса
  return { playHover, playClick, playNext }
}

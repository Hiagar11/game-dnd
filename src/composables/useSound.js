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
const swordSound = new Audio('/sounds/sword.mp3')
const whooshSound = new Audio('/sounds/whoosh.wav')
const levelUpSound = new Audio('/sounds/success.wav')

// ── Web Audio API для мгновенного воспроизведения боевых звуков ────────────────
// MP3 через new Audio() имеет задержку декодирования ~50-150мс.
// AudioContext + предзагруженный буфер воспроизводит мгновенно.
let audioCtx = null
let swordBuffer = null
let whooshBuffer = null
let shieldBashBuffer = null

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

async function preloadBuffer(url) {
  try {
    const res = await fetch(url)
    const arrayBuf = await res.arrayBuffer()
    return await getAudioCtx().decodeAudioData(arrayBuf)
  } catch {
    return null
  }
}

// Предзагрузка при первом взаимодействии пользователя (AudioContext требует жест)
// Промис хранится, чтобы повторные вызовы не запускали загрузку заново
// и чтобы playSword/playMiss могли дождаться окончания загрузки
let combatBuffersPromise = null
function ensureCombatBuffers() {
  if (combatBuffersPromise) return combatBuffersPromise
  combatBuffersPromise = (async () => {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') await ctx.resume()
    ;[swordBuffer, whooshBuffer, shieldBashBuffer] = await Promise.all([
      preloadBuffer('/sounds/sword.mp3'),
      preloadBuffer('/sounds/whoosh.wav'),
      preloadBuffer('/sounds/shield-bash.mp3'),
    ])
  })()
  return combatBuffersPromise
}

// Загружаем боевые буферы по первому клику/касанию — к началу боя они уже будут готовы
function onFirstGesture() {
  ensureCombatBuffers()
  document.removeEventListener('click', onFirstGesture)
  document.removeEventListener('touchstart', onFirstGesture)
}
document.addEventListener('click', onFirstGesture, { once: true })
document.addEventListener('touchstart', onFirstGesture, { once: true })

function playBuffer(buffer, volume = 0.85) {
  if (!buffer) return
  const ctx = getAudioCtx()
  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  source.buffer = buffer
  gain.gain.value = volume
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start(0)
}
const battleMusic = new Audio('/sounds/battle.mp3')
const travelMusic = new Audio('/sounds/travel.mp3')
const mainMenuMusic = new Audio('/sounds/main-menu.mp3')

// volume: от 0 (тихо) до 1 (максимум)
hoverSound.volume = 0.3
clickSound.volume = 0.5
nextSound.volume = 0.6
successSound.volume = 0.7
fistSound.volume = 0.8
swordSound.volume = 0.85
whooshSound.volume = 0.75
levelUpSound.volume = 0.9
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
let travelFadeId = null
let menuFadeId = null

function hardStopBattleMusic() {
  if (battleFadeId) clearInterval(battleFadeId)
  battleFadeId = null
  battleMusic.pause()
  battleMusic.volume = 0
}

function hardStopTravelMusic() {
  if (travelFadeId) clearInterval(travelFadeId)
  travelFadeId = null
  travelMusic.pause()
  travelMusic.volume = 0
}

function hardStopMainMenuMusic() {
  if (menuFadeId) clearInterval(menuFadeId)
  menuFadeId = null
  mainMenuMusic.pause()
  mainMenuMusic.volume = 0
}

export function playBattleMusic() {
  ensureCombatBuffers()
  hardStopTravelMusic()
  hardStopMainMenuMusic()
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

export function playTravelMusic() {
  hardStopBattleMusic()
  hardStopMainMenuMusic()
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
}
export function playSword() {
  if (swordBuffer) {
    playBuffer(swordBuffer, 0.85)
    return
  }
  // Буферы ещё загружаются — дождаться и воспроизвести мгновенно
  if (combatBuffersPromise) {
    combatBuffersPromise.then(() => {
      if (swordBuffer) playBuffer(swordBuffer, 0.85)
      else {
        swordSound.currentTime = 0
        swordSound.play().catch(() => {})
      }
    })
    return
  }
  // Буферы не запрашивались — запустить загрузку + пока fallback
  ensureCombatBuffers()
  swordSound.currentTime = 0
  swordSound.play().catch(() => {})
}
export function playMiss() {
  if (whooshBuffer) {
    playBuffer(whooshBuffer, 0.75)
    return
  }
  // Буферы ещё загружаются — дождаться
  if (combatBuffersPromise) {
    combatBuffersPromise.then(() => {
      if (whooshBuffer) playBuffer(whooshBuffer, 0.75)
      else {
        whooshSound.currentTime = 0
        whooshSound.play().catch(() => {})
      }
    })
    return
  }
  ensureCombatBuffers()
  whooshSound.currentTime = 0
  whooshSound.play().catch(() => {})
}
export function playLevelUp() {
  levelUpSound.currentTime = 0
  levelUpSound.play().catch(() => {})
}
export function playShieldBash() {
  if (shieldBashBuffer) {
    playBuffer(shieldBashBuffer, 0.8)
    return
  }
  if (combatBuffersPromise) {
    combatBuffersPromise.then(() => {
      if (shieldBashBuffer) playBuffer(shieldBashBuffer, 0.8)
    })
    return
  }
  ensureCombatBuffers()
}

/**
 * Быстрый шаг — синтетический звук через Web Audio API:
 * быстрый свист с нарастанием частоты + lfo-пульс для ощущения движения.
 */
export function playQuickStep() {
  const ctx = getAudioCtx()
  if (!ctx) return

  const now = ctx.currentTime
  const duration = 0.35

  // Основной осциллятор — sinusoidal sweep с 2200↑720 Гц (свист вниз)
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(2200, now)
  osc.frequency.exponentialRampToValueAtTime(720, now + duration)

  // Второй осциллятор — добавляет воздушность (пильная гармоника)
  const osc2 = ctx.createOscillator()
  osc2.type = 'triangle'
  osc2.frequency.setValueAtTime(1760, now)
  osc2.frequency.exponentialRampToValueAtTime(580, now + duration)

  // Фильтр высоких частот для плавности
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(1800, now)
  filter.frequency.exponentialRampToValueAtTime(650, now + duration)
  filter.Q.setValueAtTime(1.2, now)

  // Огибание амплитуды: быстрый attack → плавный release
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.28, now + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(filter)
  osc2.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc2.start(now)
  osc.stop(now + duration)
  osc2.stop(now + duration)
}

export function playMainMenuMusic() {
  hardStopBattleMusic()
  hardStopTravelMusic()
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

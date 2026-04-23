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
const bloodWhisperSound = new Audio('/sounds/blood-whisper.mp3')
const magicImpactSound = new Audio('/sounds/magic-impact.mp3')
// Звук вылета кровавого снаряда: тёмная магия (основной слой) + магическое эхо полёта
const bloodProjectileLaunchSound = new Audio('/sounds/blood-projectile-launch.mp3')
const bloodProjectileWhooshSound = new Audio('/sounds/blood-projectile-whoosh.mp3')
bloodWhisperSound.preload = 'auto'
bloodWhisperSound.load()
magicImpactSound.preload = 'auto'
magicImpactSound.load()
bloodProjectileLaunchSound.preload = 'auto'
bloodProjectileLaunchSound.load()
bloodProjectileWhooshSound.preload = 'auto'
bloodProjectileWhooshSound.load()

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

function playTimedAudioLayer(
  baseAudio,
  { volume = 1, playbackRate = 1, startAt = 0, durationMs = 3000 } = {}
) {
  const audio = baseAudio.cloneNode(true)
  audio.currentTime = startAt
  audio.volume = volume
  audio.playbackRate = playbackRate

  // Без сохранения высоты тембр становится менее явно женским/мужским.
  if ('preservesPitch' in audio) audio.preservesPitch = false
  if ('mozPreservesPitch' in audio) audio.mozPreservesPitch = false
  if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = false

  audio.play().catch(() => {})

  window.setTimeout(() => {
    audio.pause()
    audio.currentTime = 0
  }, durationMs)

  return audio
}
const BATTLE_TRACKS = [
  { src: '/sounds/battle-1.mp3', gain: 0.92 },
  { src: '/sounds/battle-2.mp3', gain: 0.82 },
  { src: '/sounds/battle-3.mp3', gain: 0.95 },
  { src: '/sounds/battle-4.mp3', gain: 0.93 },
  { src: '/sounds/battle-5.mp3', gain: 0.86 },
  { src: '/sounds/battle-6.mp3', gain: 0.84 },
]

// Midnight Forest, Fantasy Medieval Ambient, Medieval city/tavern ambient,
// Warm/Bright Fantasy Ambient, Fantasy RPG Exploration V2, Medieval Inn
const TRAVEL_TRACKS = [
  { src: '/sounds/travel-1.mp3', gain: 0.9 },
  { src: '/sounds/travel-2.mp3', gain: 0.88 },
  { src: '/sounds/travel-3.mp3', gain: 0.92 },
  { src: '/sounds/travel-4.mp3', gain: 0.95 },
  { src: '/sounds/travel-5.mp3', gain: 0.85 },
  { src: '/sounds/travel-6.mp3', gain: 0.88 },
]

const BATTLE_FALLBACK_TRACK = '/sounds/battle.mp3'
const TRAVEL_FALLBACK_TRACK = '/sounds/travel.mp3'

const battleMusic = new Audio(BATTLE_TRACKS[0].src)
const travelMusic = new Audio(TRAVEL_TRACKS[0].src)
const mainMenuMusic = new Audio('/sounds/main-menu.mp3')

let lastBattleTrackIndex = 0
let currentBattleTrackGain = BATTLE_TRACKS[0].gain
let battleTrackPool = []

let lastTravelTrackIndex = 0
let currentTravelTrackGain = TRAVEL_TRACKS[0].gain
let travelTrackPool = []

function rebuildBattleTrackPool() {
  const candidates = []
  for (let i = 0; i < BATTLE_TRACKS.length; i++) {
    if (BATTLE_TRACKS.length > 1 && i === lastBattleTrackIndex) continue
    candidates.push(i)
  }

  // Fisher-Yates shuffle, чтобы пройтись по всем трекам без «залипания» одного.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  battleTrackPool = candidates
}

function pickRandomBattleTrackIndex() {
  if (BATTLE_TRACKS.length <= 1) return 0
  if (battleTrackPool.length === 0) rebuildBattleTrackPool()
  return battleTrackPool.shift()
}

function switchBattleTrack() {
  const nextIndex = pickRandomBattleTrackIndex()
  lastBattleTrackIndex = nextIndex
  currentBattleTrackGain = BATTLE_TRACKS[nextIndex].gain
  battleMusic.src = BATTLE_TRACKS[nextIndex].src
  battleMusic.load()
}

function rebuildTravelTrackPool() {
  const candidates = []
  for (let i = 0; i < TRAVEL_TRACKS.length; i++) {
    if (TRAVEL_TRACKS.length > 1 && i === lastTravelTrackIndex) continue
    candidates.push(i)
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  travelTrackPool = candidates
}

function pickRandomTravelTrackIndex() {
  if (TRAVEL_TRACKS.length <= 1) return 0
  if (travelTrackPool.length === 0) rebuildTravelTrackPool()
  return travelTrackPool.shift()
}

function switchTravelTrack() {
  const nextIndex = pickRandomTravelTrackIndex()
  lastTravelTrackIndex = nextIndex
  currentTravelTrackGain = TRAVEL_TRACKS[nextIndex].gain
  travelMusic.src = TRAVEL_TRACKS[nextIndex].src
  travelMusic.load()
}

function getTravelMusicTargetVolume() {
  return Math.min(1, 0.4 * currentTravelTrackGain)
}

function getBattleMusicBaseTargetVolume() {
  return Math.min(1, BATTLE_MUSIC_VOLUME * currentBattleTrackGain)
}

// Когда боевой трек закончился — сразу переключаемся на следующий случайный
battleMusic.addEventListener('ended', () => {
  switchBattleTrack()
  battleMusic.volume = getBattleMusicBaseTargetVolume()
  battleMusic.play().catch(() => {})
})

battleMusic.addEventListener('error', () => {
  // Профилактика: если кастомный трек недоступен, откатываемся на стандартный battle.mp3.
  currentBattleTrackGain = 1
  battleMusic.src = BATTLE_FALLBACK_TRACK
  battleMusic.load()
  battleMusic.volume = 0
  battleMusic.currentTime = 0
  battleMusic.play().catch(() => {})
})

// Когда мирный трек закончился — плавно переходим к следующему
travelMusic.addEventListener('ended', () => {
  if (travelFadeId) clearInterval(travelFadeId)
  switchTravelTrack()
  travelMusic.volume = 0
  travelMusic.currentTime = 0
  travelMusic.play().catch(() => {})
  travelFadeId = fadeAudio(travelMusic, getTravelMusicTargetVolume(), 1200, () => {
    travelFadeId = null
  })
})

travelMusic.addEventListener('error', () => {
  // Профилактика: если трек недоступен, откатываемся на стандартный travel.mp3.
  currentTravelTrackGain = 1
  travelMusic.src = TRAVEL_FALLBACK_TRACK
  travelMusic.load()
  travelMusic.volume = 0
  travelMusic.currentTime = 0
  travelMusic.play().catch(() => {})
})

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
// loop отключён: при окончании трека ended-обработчик переключает на следующий
travelMusic.volume = 0
mainMenuMusic.volume = 0
mainMenuMusic.loop = true
bloodWhisperSound.volume = 0.8

const BATTLE_MUSIC_VOLUME = 0.45
// Во время каста музыка почти уходит в подложку, чтобы магия читалась отчётливо.
const BATTLE_CAST_DUCK_VOLUME = Math.min(0.03, BATTLE_MUSIC_VOLUME * 0.06)

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
    switchBattleTrack()
    battleMusic.volume = 0
    battleMusic.currentTime = 0
    battleMusic.play().catch(() => {})
  }
  battleFadeId = fadeAudio(battleMusic, getBattleMusicBaseTargetVolume(), 2500, () => {
    battleFadeId = null
  })
}

// При касте временно опускаем громкость боевой музыки до 20% от нормы,
// чтобы детали заклинания были хорошо слышны и не тонули в миксе.
export function duckBattleMusic(durationMs = 220) {
  if (battleMusic.paused) return
  if (battleFadeId) clearInterval(battleFadeId)
  battleFadeId = fadeAudio(
    battleMusic,
    Math.min(BATTLE_CAST_DUCK_VOLUME, getBattleMusicBaseTargetVolume() * 0.12),
    durationMs,
    () => {
      battleFadeId = null
    }
  )
}

export function restoreBattleMusic(durationMs = 480) {
  if (battleMusic.paused) return
  if (battleFadeId) clearInterval(battleFadeId)
  battleFadeId = fadeAudio(battleMusic, getBattleMusicBaseTargetVolume(), durationMs, () => {
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
    switchTravelTrack()
    travelMusic.volume = 0
    travelMusic.currentTime = 0
    travelMusic.play().catch(() => {})
  }
  travelFadeId = fadeAudio(travelMusic, getTravelMusicTargetVolume(), 2500, () => {
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

function playTransient(baseAudio, { volume = null, playbackRate = 1 } = {}) {
  const audio = baseAudio.cloneNode(true)
  audio.currentTime = 0
  if (volume != null) audio.volume = volume
  audio.playbackRate = playbackRate
  audio.play().catch(() => {})
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

/**
 * Кровавое заклинание: синтезированный магический шёпот.
 * Розовый шум (1/f) → полосовой фильтр ~1100Hz → AM-модуляция 6.5Hz.
 * Имитирует тихое скандирование заклинания без внешних аудиофайлов.
 */
export function playBloodCast() {
  const castDurationMs = 3000

  // Прямое layered-проигрывание надёжнее Web Audio-цепочки и лучше переживает
  // браузерные ограничения autoplay. Используем один и тот же шёпот в 3 слоя.
  playTimedAudioLayer(bloodWhisperSound, {
    volume: 0.88,
    playbackRate: 0.84,
    startAt: 0,
    durationMs: castDurationMs,
  })

  playTimedAudioLayer(bloodWhisperSound, {
    volume: 0.3,
    playbackRate: 0.7,
    startAt: 0.06,
    durationMs: castDurationMs,
  })

  window.setTimeout(() => {
    playTimedAudioLayer(bloodWhisperSound, {
      volume: 0.18,
      playbackRate: 1.02,
      startAt: 0.1,
      durationMs: 1600,
    })
  }, 260)
}

/**
 * Кровавый снаряд в полёте.
 * Слой 1: тёмная магия (низкий, давящий выброс энергии).
 * Слой 2: магическое эхо полёта (лёгкий хвост свиста).
 */
export function playBloodProjectile() {
  // Основной звук запуска — тёмная тяжёлая магия
  playTransient(bloodProjectileLaunchSound, {
    volume: 0.82,
    playbackRate: 0.92,
  })
  // Лёгкий хвост полёта поверх — добавляет ощущение скорости снаряда
  playTransient(bloodProjectileWhooshSound, {
    volume: 0.45,
    playbackRate: 1.08,
  })
}

/**
 * Попадание кровавой магии.
 */
export function playBloodImpact() {
  playTransient(magicImpactSound, {
    volume: 0.84,
    playbackRate: 0.96,
  })

  // Лёгкий верхний слой добавляет магическую "искру" без эффекта рукопашного удара.
  playTransient(magicImpactSound, {
    volume: 0.24,
    playbackRate: 1.16,
  })
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

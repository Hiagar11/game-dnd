// Конфигурация порогов отношений NPC.
//
// Пороги определяются полем dispositionType токена — натурой НПС.
// Пять типов натуры: от дружелюбного (легко стать другом) до враждебного (почти невозможно).
// Множитель влияния рассчитывается динамически из heroPersuasion.
//
// Диапазон очков: -30..+60.

const ATTITUDE_THRESHOLDS = {
  friendly: { ally: 15, enemy: -23 },
  sociable: { ally: 21, enemy: -18 },
  neutral: { ally: 30, enemy: -15 },
  guarded: { ally: 39, enemy: -10 },
  hostile: { ally: 45, enemy: -8 },
}

/**
 * Возвращает пороги по натуре НПС (dispositionType).
 * @param {string} dispositionType — 'friendly' | 'sociable' | 'neutral' | 'guarded' | 'hostile'
 * @returns {{ ally: number, enemy: number }}
 */
export function getAttitudeThresholds(dispositionType) {
  return ATTITUDE_THRESHOLDS[dispositionType] ?? ATTITUDE_THRESHOLDS.neutral
}

/**
 * Речевой регистр — влияет на то КАК NPC говорит, независимо от текущего отношения.
 * Это «натура» персонажа: осторожный NPC будет настороженным даже к другу.
 */
export const SPEECH_REGISTER = {
  friendly:
    'По натуре ты дружелюбен — открыт, доброжелателен, первым идёшь на контакт. Даже с незнакомцами стараешься найти общий язык.',
  sociable:
    'Ты общительный — любишь поболтать, легко находишь общий язык. Можешь заговорить первым, активно жестикулируешь.',
  neutral: '',
  guarded:
    'Ты осторожен от природы — взвешиваешь слова, не торопишься доверять. Говоришь мало, наблюдаешь много.',
  hostile:
    'Ты от природы агрессивен и недоверчив — ищешь подвох в каждом слове. Провоцируешь, давишь, запугиваешь.',
}

/**
 * Рассчитывает множитель положительного влияния из persuasion героя.
 * persuasion 0 → ×0.8, persuasion 10 → ×1.4, persuasion 20 → ×2.0 (cap).
 * @param {number} heroPersuasion
 * @returns {number}
 */
export function getPersuasionMultiplier(heroPersuasion) {
  const p = Number.isFinite(heroPersuasion) ? Math.max(0, heroPersuasion) : 0
  return Math.min(2.0, 0.8 + p * 0.06)
}

/**
 * Асимметричные весовые коэффициенты для дельты отношений.
 * Негатив (угрозы, оскорбления) бьёт сильнее — стать врагом легко.
 * Позитив (дружелюбие, помощь) даётся с трудом — заслужить доверие сложно.
 */
export const ATTITUDE_WEIGHTS = {
  negative: 1.0, // AI даёт финальные очки напрямую (-15..-1)
  positive: 0.6, // +5 от AI → итого +3 (до persuasionMult)
}

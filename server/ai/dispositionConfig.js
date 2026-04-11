// Конфигурация типов нрава НПС.
//
// Нрав определяет:
//   ally             — минимальный счёт для перехода в 'friendly' (союзник)
//   enemy            — максимальный счёт для перехода в 'hostile' (враг)
//   positiveMultiplier — множитель для ПОЛОЖИТЕЛЬНЫХ дельт (насколько легко завоевать расположение)
//
// Отрицательные дельты (гнев, обиды) всегда ×1 — нрав влияет только на скорость сближения.
// Пороги врага компенсируют это: дружелюбный НПС труднее разозлить насовсем (threshold -80),
// враждебный — легко (threshold -30).
//
// Диапазон очков: -100..+100.

export const DISPOSITION_CONFIG = {
  friendly: { ally: 20, enemy: -80, positiveMultiplier: 2.0 },
  sociable: { ally: 35, enemy: -65, positiveMultiplier: 1.5 },
  neutral: { ally: 50, enemy: -50, positiveMultiplier: 1.0 },
  guarded: { ally: 60, enemy: -40, positiveMultiplier: 0.75 },
  hostile: { ally: 70, enemy: -30, positiveMultiplier: 0.5 },
}

/**
 * Возвращает конфиг нрава. Если тип неизвестен — возвращает нейтральный.
 * @param {string} type
 * @returns {{ ally: number, enemy: number, positiveMultiplier: number }}
 */
export function getDispositionConfig(type) {
  return DISPOSITION_CONFIG[type] ?? DISPOSITION_CONFIG.neutral
}

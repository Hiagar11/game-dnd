// Composable — это обычная JS-функция, название начинается с "use" (соглашение Vue).
// Она содержит логику, которую можно переиспользовать в разных компонентах.
// Этот composable отвечает за воспроизведение звуков интерфейса.

// Объекты Audio создаются ОДИН РАЗ на уровне модуля (singleton).
// Если создавать их внутри useSound(), при каждом вызове (а он есть в ~15 компонентах)
// мы получили бы ~30 лишних Audio-объектов в памяти.
const hoverSound = new Audio('/sounds/hover.wav')
const clickSound = new Audio('/sounds/click.wav')

// volume: от 0 (тихо) до 1 (максимум)
hoverSound.volume = 0.3
clickSound.volume = 0.5

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

  // Возвращаем только то, что нужно компоненту — принцип минимального интерфейса
  return { playHover, playClick }
}

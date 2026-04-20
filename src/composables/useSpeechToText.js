import { ref, onUnmounted } from 'vue'

/**
 * Composable для распознавания речи через Web Speech API.
 * Работает только в Chrome/Edge. В неподдерживаемых браузерах isSupported = false.
 *
 * @param {object} options
 * @param {import('vue').Ref<string>} options.target — ref, в который дописывается распознанный текст
 * @param {string} [options.lang='ru-RU'] — язык распознавания
 * @returns {{ isSupported: boolean, isListening: Ref<boolean>, toggle: () => void, stop: () => void }}
 */
export function useSpeechToText({ target, lang = 'ru-RU' } = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  // Если API нет — возвращаем заглушку
  if (!SpeechRecognition) {
    return {
      isSupported: false,
      isListening: ref(false),
      toggle() {},
      stop() {},
    }
  }

  const isListening = ref(false)
  const recognition = new SpeechRecognition()

  recognition.lang = lang
  recognition.continuous = false // Одна фраза за нажатие
  recognition.interimResults = false // Только финальный результат

  recognition.addEventListener('result', (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim()
    if (!transcript || !target) return

    // Дописываем к текущему тексту через пробел
    const current = target.value
    target.value = current ? `${current} ${transcript}` : transcript
  })

  recognition.addEventListener('end', () => {
    isListening.value = false
  })

  recognition.addEventListener('error', () => {
    isListening.value = false
  })

  function toggle() {
    if (isListening.value) {
      recognition.stop()
    } else {
      recognition.start()
      isListening.value = true
    }
  }

  function stop() {
    if (isListening.value) {
      recognition.stop()
    }
  }

  onUnmounted(stop)

  return {
    isSupported: true,
    isListening,
    toggle,
    stop,
  }
}

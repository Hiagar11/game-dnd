// Управление диалоговыми облаками НПС и стрелками изменения отношения.
// Вынесено из GameTokens.vue: всё состояние диалога сосредоточено здесь.
import { ref, onUnmounted } from 'vue'

export function useNpcDialog(store) {
  // uid → { messages: [{who:'npc'|'player', text}], loading: bool, heroSrc, npcScore }
  // Map позволяет нескольким НПС говорить одновременно.
  const dialogBubbles = ref(new Map())

  // Map uid → функция очистки (снимает document-слушатель кликов снаружи)
  const bubbleCleanups = new Map()

  // uid → 'up' | 'down' — стрелка изменения отношения (анимация 1.5с)
  const attitudeArrows = ref({})

  // Закрыть облако конкретного токена и снять слушатель
  function closeBubble(uid) {
    const m = new Map(dialogBubbles.value)
    m.delete(uid)
    dialogBubbles.value = m
    bubbleCleanups.get(uid)?.()
    bubbleCleanups.delete(uid)
  }

  // Открыть новый диалог (пустой, в состоянии загрузки). Регистрирует закрытие по клику снаружи.
  function openBubble(uid, heroSrc = null) {
    closeBubble(uid)
    const next = new Map(dialogBubbles.value)
    const placed = store.placedTokens.find((t) => t.uid === uid)
    const initScore =
      placed?.attitude === 'friendly' ? 50 : placed?.attitude === 'hostile' ? -50 : 0
    next.set(uid, { messages: [], loading: true, heroSrc, npcScore: initScore })
    dialogBubbles.value = next
    const timer = setTimeout(() => {
      function onOutsideClick(e) {
        const insideBubble = e.composedPath().some((el) => el.classList?.contains('dialog-bubble'))
        if (!insideBubble) closeBubble(uid)
      }
      document.addEventListener('click', onOutsideClick, true)
      bubbleCleanups.set(uid, () => document.removeEventListener('click', onOutsideClick, true))
    }, 150)
    bubbleCleanups.set(uid, () => clearTimeout(timer))
  }

  // Добавить реплику НПС и снять флаг загрузки
  function addNpcMessage(uid, text, npcScore) {
    const m = new Map(dialogBubbles.value)
    const b = m.get(uid)
    if (!b) return
    const update = { ...b, messages: [...b.messages, { who: 'npc', text }], loading: false }
    if (npcScore !== undefined) update.npcScore = npcScore
    m.set(uid, update)
    dialogBubbles.value = m
  }

  // Добавить реплику игрока и поставить флаг загрузки (ждём ответа ИИ)
  function addPlayerMessage(uid, text) {
    const m = new Map(dialogBubbles.value)
    const b = m.get(uid)
    if (!b) return
    m.set(uid, { ...b, messages: [...b.messages, { who: 'player', text }], loading: true })
    dialogBubbles.value = m
  }

  // Тригернуть стрелку изменения отношения на токене (1.5с)
  // Заменяем весь объект чтобы гарантированно триггернуть Vue-реактивность
  function triggerAttitudeArrow(uid, direction) {
    attitudeArrows.value = { ...attitudeArrows.value, [uid]: direction }
    setTimeout(() => {
      const next = { ...attitudeArrows.value }
      delete next[uid]
      attitudeArrows.value = next
    }, 1500)
  }

  // Снимаем все слушатели при размонтировании компонента
  onUnmounted(() => {
    for (const cleanup of bubbleCleanups.values()) cleanup()
    bubbleCleanups.clear()
  })

  return {
    dialogBubbles,
    attitudeArrows,
    closeBubble,
    openBubble,
    addNpcMessage,
    addPlayerMessage,
    triggerAttitudeArrow,
  }
}

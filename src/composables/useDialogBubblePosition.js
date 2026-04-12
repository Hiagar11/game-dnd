import { nextTick, onMounted, watch } from 'vue'

export function useDialogBubblePosition({
  el,
  scrollEl,
  inputEl,
  messages,
  loading,
  below,
  shiftX,
  ready,
}) {
  const MARGIN = 12

  function scrollToBottom() {
    nextTick(() => {
      if (!scrollEl.value) return
      scrollEl.value.scrollTop = scrollEl.value.scrollHeight
    })
  }

  function positionBubble() {
    nextTick(() => {
      if (!el.value) return

      const rect = el.value.getBoundingClientRect()
      const viewportWidth = window.innerWidth

      if (rect.top < MARGIN) {
        below.value = true
      }

      if (rect.left < MARGIN) {
        shiftX.value = MARGIN - rect.left
      } else if (rect.right > viewportWidth - MARGIN) {
        shiftX.value = -(rect.right - (viewportWidth - MARGIN))
      }

      ready.value = true
      inputEl.value?.focus()
    })
  }

  watch(() => [messages.value.length, loading.value], scrollToBottom)

  onMounted(positionBubble)
}

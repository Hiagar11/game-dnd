import { ref } from 'vue'

export function useCursorIconPicker(setCursorIcon, playClick) {
  const cursorIconUrl = ref('')

  function onIconUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target.result
      cursorIconUrl.value = dataUrl
      setCursorIcon(dataUrl)
    }
    reader.readAsDataURL(file)

    event.target.value = ''
  }

  function resetIcon() {
    playClick()
    cursorIconUrl.value = ''
    setCursorIcon(null)
  }

  return {
    cursorIconUrl,
    onIconUpload,
    resetIcon,
  }
}

import { watch } from 'vue'

export function usePopupCursorBlock({ props, activeTab, blockCursor, unblockCursor }) {
  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        blockCursor?.()
        activeTab.value = props.initialTab
      } else {
        unblockCursor?.()
      }
    }
  )
}

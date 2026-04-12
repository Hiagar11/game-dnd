import { watch } from 'vue'

export function usePanBroadcast({ viewRef, offsetX, offsetY, getSocket, sessionActive }) {
  let panLastEmit = 0

  function emitPan(x, y) {
    const viewW = viewRef.value?.offsetWidth ?? window.innerWidth
    const viewH = viewRef.value?.offsetHeight ?? window.innerHeight
    getSocket()?.emit('game:pan', {
      mapCenterX: viewW / 2 - x,
      mapCenterY: viewH / 2 - y,
    })
  }

  watch([offsetX, offsetY], ([x, y]) => {
    if (!sessionActive.value) return
    const now = Date.now()
    if (now - panLastEmit < 32) return
    panLastEmit = now
    emitPan(x, y)
  })

  return {
    emitPan,
  }
}

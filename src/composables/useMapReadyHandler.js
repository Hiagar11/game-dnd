import { nextTick } from 'vue'

export function useMapReadyHandler({ canvasRef, mapSize, mapRef }) {
  function onMapReady(canvas) {
    canvasRef.value = canvas
    nextTick(() => {
      mapSize.value = { width: canvas.width, height: canvas.height }
      if (mapRef.value) {
        mapRef.value.style.width = `${canvas.width}px`
        mapRef.value.style.height = `${canvas.height}px`
      }
    })
  }

  return {
    onMapReady,
  }
}

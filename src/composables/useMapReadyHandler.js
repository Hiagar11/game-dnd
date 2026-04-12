export function useMapReadyHandler({ canvasRef, mapSize, mapRef }) {
  function onMapReady(canvas) {
    canvasRef.value = canvas
    mapSize.value = { width: canvas.width, height: canvas.height }
    mapRef.value.style.width = `${canvas.width}px`
    mapRef.value.style.height = `${canvas.height}px`
  }

  return {
    onMapReady,
  }
}

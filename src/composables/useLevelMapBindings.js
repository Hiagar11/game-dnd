export function useLevelMapBindings({ canvasRef, mapSize, mapRef, gameStore, closeContextMenu }) {
  function onMapReady(canvas) {
    canvasRef.value = canvas
    mapSize.value = { width: canvas.width, height: canvas.height }
    mapRef.value.style.width = `${canvas.width}px`
    mapRef.value.style.height = `${canvas.height}px`
  }

  function onMapClick() {
    gameStore.selectPlacedToken(null)
    closeContextMenu()
  }

  return {
    onMapReady,
    onMapClick,
  }
}

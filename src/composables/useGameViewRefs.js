import { ref } from 'vue'

export function useGameViewRefs() {
  const viewRef = ref(null)
  const mapRef = ref(null)
  const canvasRef = ref(null)
  const mapSize = ref({ width: 0, height: 0 })

  return {
    viewRef,
    mapRef,
    canvasRef,
    mapSize,
  }
}

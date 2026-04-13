// Composable для формы глобальной карты (создание/редактирование).
// Управляет состоянием формы, остановками, маршрутами и save-логикой.
import { ref, computed } from 'vue'
import { useGlobalMapsStore } from '../stores/globalMaps'

let stopCounter = 0

function generateUid() {
  return `stop-${Date.now()}-${++stopCounter}`
}

export function useGlobalMapForm() {
  const store = useGlobalMapsStore()

  const form = ref({
    id: null,
    name: '',
    imageUrl: null,
    imagePath: null,
    stops: [],
    paths: [],
  })
  const saving = ref(false)
  const uploadingMap = ref(false)
  const saveError = ref('')

  const canSave = computed(
    () =>
      form.value.name.length > 0 &&
      (form.value.imagePath !== null || form.value._pendingFile != null) &&
      !uploadingMap.value &&
      !saving.value
  )

  function resetForm() {
    saveError.value = ''
    form.value = {
      id: null,
      name: '',
      imageUrl: null,
      imagePath: null,
      stops: [],
      paths: [],
    }
  }

  function fillFormFromMap(gm) {
    form.value = {
      id: String(gm.id),
      name: gm.name,
      imageUrl: gm.imageUrl,
      imagePath: gm.imagePath,
      stops: (gm.stops ?? []).map((s) => ({ ...s })),
      paths: (gm.paths ?? []).map((p) => ({
        ...p,
        waypoints: (p.waypoints ?? []).map((w) => ({ ...w })),
      })),
    }
  }

  // ─── Загрузка изображения ────────────────────────────────────────────────────
  async function uploadMapFile(file) {
    uploadingMap.value = true
    saveError.value = ''
    try {
      if (form.value.id) {
        const updated = await store.replaceMapImage(form.value.id, file)
        form.value.imageUrl = updated.imageUrl
        form.value.imagePath = updated.imagePath
      } else {
        form.value.imageUrl = URL.createObjectURL(file)
        form.value._pendingFile = file
      }
    } catch (err) {
      saveError.value = err.message || 'Ошибка загрузки карты'
    } finally {
      uploadingMap.value = false
    }
  }

  // ─── Остановки ───────────────────────────────────────────────────────────────
  function addStop(x, y) {
    const uid = generateUid()
    form.value.stops.push({ uid, x, y, label: '', scenarioId: null })
    return uid
  }

  function moveStop(uid, x, y) {
    const s = form.value.stops.find((s) => s.uid === uid)
    if (s) {
      s.x = x
      s.y = y
    }
  }

  function removeStop(uid) {
    form.value.stops = form.value.stops.filter((s) => s.uid !== uid)
    form.value.paths = form.value.paths.filter((p) => p.from !== uid && p.to !== uid)
  }

  function updateStopLabel(uid, label) {
    const s = form.value.stops.find((s) => s.uid === uid)
    if (s) s.label = label
  }

  // ─── Маршруты ────────────────────────────────────────────────────────────────
  function addPath(fromUid, toUid, waypoints = []) {
    const exists = form.value.paths.some(
      (p) => (p.from === fromUid && p.to === toUid) || (p.from === toUid && p.to === fromUid)
    )
    if (exists) return false
    form.value.paths.push({ from: fromUid, to: toUid, waypoints: [...waypoints] })
    return true
  }

  function removePath(fromUid, toUid) {
    form.value.paths = form.value.paths.filter(
      (p) => !((p.from === fromUid && p.to === toUid) || (p.from === toUid && p.to === fromUid))
    )
  }

  // ─── Сохранение ──────────────────────────────────────────────────────────────
  async function onSave(onSuccess) {
    if (!canSave.value) return
    saving.value = true
    saveError.value = ''
    try {
      if (form.value.id) {
        const updated = await store.updateMap(form.value.id, {
          name: form.value.name,
          stops: form.value.stops,
          paths: form.value.paths,
        })
        form.value.id = String(updated.id)
      } else {
        const file = form.value._pendingFile
        if (!file) {
          saveError.value = 'Файл карты не выбран'
          saving.value = false
          return
        }
        const created = await store.uploadMap(file, form.value.name)
        if (form.value.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(form.value.imageUrl)
        form.value.id = String(created.id)
        form.value.imageUrl = created.imageUrl
        form.value.imagePath = created.imagePath
        delete form.value._pendingFile

        // Сразу сохраняем остановки/маршруты если были добавлены
        if (form.value.stops.length || form.value.paths.length) {
          await store.updateMap(form.value.id, {
            name: form.value.name,
            stops: form.value.stops,
            paths: form.value.paths,
          })
        }
      }
      onSuccess?.()
    } catch (err) {
      saveError.value = err.message || 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  // ─── Удаление ────────────────────────────────────────────────────────────────
  async function onDelete(resetFn) {
    if (!confirm(`Удалить «${form.value.name}»?`)) return
    saving.value = true
    try {
      await store.deleteMap(form.value.id)
      resetFn?.()
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    } finally {
      saving.value = false
    }
  }

  async function onDeleteMap(gm, resetFn) {
    if (!confirm(`Удалить «${gm.name}»?`)) return
    try {
      await store.deleteMap(gm.id)
      if (form.value.id === String(gm.id)) resetFn?.()
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    }
  }

  return {
    form,
    saving,
    uploadingMap,
    saveError,
    canSave,
    resetForm,
    fillFormFromMap,
    uploadMapFile,
    addStop,
    moveStop,
    removeStop,
    updateStopLabel,
    addPath,
    removePath,
    onSave,
    onDelete,
    onDeleteMap,
  }
}

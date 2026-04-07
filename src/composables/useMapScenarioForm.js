// Composable для формы создания/редактирования карты (EditorMapsSection).
// Инкапсулирует: состояние формы, загрузку карты, сохранение и удаление.
// Очистка canvas (clearImage) — ответственность компонента, не composable.
import { ref, computed } from 'vue'
import { useScenariosStore } from '../stores/scenarios'

const DEFAULT_CELL_SIZE = 60

export function useMapScenarioForm() {
  const store = useScenariosStore()

  const form = ref({
    id: null,
    name: '',
    mapImageUrl: null,
    mapImagePath: null,
    cellSize: DEFAULT_CELL_SIZE,
  })
  const saving = ref(false)
  const uploadingMap = ref(false)
  const saveError = ref('')

  const canSave = computed(
    () =>
      form.value.name.length > 0 &&
      form.value.mapImagePath !== null &&
      !uploadingMap.value &&
      !saving.value
  )

  // ─── Навигация по списку ─────────────────────────────────────────────────────
  // Вызывать вместе с clearImage() в компоненте
  function resetForm() {
    saveError.value = ''
    form.value = {
      id: null,
      name: '',
      mapImageUrl: null,
      mapImagePath: null,
      cellSize: DEFAULT_CELL_SIZE,
    }
  }

  function fillFormFromScenario(s) {
    saveError.value = ''
    form.value = {
      id: String(s.id),
      name: s.name,
      mapImageUrl: s.mapImageUrl ?? null,
      mapImagePath: s.mapImagePath ?? null,
      cellSize: s.cellSize ?? DEFAULT_CELL_SIZE,
    }
  }

  // ─── Загрузка изображения карты ──────────────────────────────────────────────
  async function uploadMapFile(file) {
    uploadingMap.value = true
    saveError.value = ''
    try {
      const result = await store.uploadMapImage(file)
      form.value.mapImageUrl = result.mapImageUrl
      form.value.mapImagePath = result.mapImagePath
    } catch (err) {
      saveError.value = err.message || 'Ошибка загрузки карты'
    } finally {
      uploadingMap.value = false
    }
  }

  // ─── Сохранение / обновление ─────────────────────────────────────────────────
  async function onSave() {
    if (!canSave.value) return
    saving.value = true
    saveError.value = ''
    const payload = {
      name: form.value.name,
      mapImagePath: form.value.mapImagePath,
      cellSize: form.value.cellSize,
    }
    try {
      if (form.value.id) {
        const updated = await store.updateScenario(form.value.id, payload)
        form.value.id = String(updated.id)
      } else {
        const duplicate = store.scenarios.find(
          (s) => s.name.trim().toLowerCase() === form.value.name.toLowerCase()
        )
        if (duplicate) {
          saveError.value = 'Карта с таким именем уже существует'
          saving.value = false
          return
        }
        const created = await store.createScenario(payload)
        form.value.id = String(created.id)
      }
    } catch (err) {
      saveError.value = err.message || 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  // ─── Удаление текущей карты ───────────────────────────────────────────────────
  // Компонент должен вызвать clearImage() после успеха или передать resetFn
  async function onDelete(resetFn) {
    if (!confirm(`Удалить «${form.value.name}»?`)) return
    saving.value = true
    try {
      await store.deleteScenario(form.value.id)
      resetFn?.()
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    } finally {
      saving.value = false
    }
  }

  // Удаление из сайдбара — принимает объект сценария
  async function onDeleteScenario(s, resetFn) {
    if (!confirm(`Удалить «${s.name || 'Без названия'}»?`)) return
    saving.value = true
    saveError.value = ''
    try {
      await store.deleteScenario(String(s.id))
      if (String(s.id) === form.value.id) resetFn?.()
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    } finally {
      saving.value = false
    }
  }

  return {
    form,
    saving,
    uploadingMap,
    saveError,
    canSave,
    resetForm,
    fillFormFromScenario,
    uploadMapFile,
    onSave,
    onDelete,
    onDeleteScenario,
  }
}

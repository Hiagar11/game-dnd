// Composable для формы создания/редактирования карты (EditorMapsSection).
// Работает с Map-сущностью (библиотека карт), а не с Scenario.
import { ref, computed } from 'vue'
import { useMapsStore } from '../stores/maps'

const DEFAULT_CELL_SIZE = 60

export function useMapScenarioForm() {
  const store = useMapsStore()

  const form = ref({
    id: null,
    name: '',
    imageUrl: null,
    imagePath: null,
    cellSize: DEFAULT_CELL_SIZE,
    gridOffsetX: 0,
    gridOffsetY: 0,
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

  // ─── Навигация по списку ─────────────────────────────────────────────────────
  function resetForm() {
    saveError.value = ''
    form.value = {
      id: null,
      name: '',
      imageUrl: null,
      imagePath: null,
      cellSize: DEFAULT_CELL_SIZE,
      gridOffsetX: 0,
      gridOffsetY: 0,
    }
  }

  function fillFormFromMap(m) {
    saveError.value = ''
    form.value = {
      id: String(m.id),
      name: m.name,
      imageUrl: m.imageUrl ?? null,
      imagePath: m.imagePath ?? null,
      cellSize: m.cellSize ?? DEFAULT_CELL_SIZE,
      gridOffsetX: m.gridOffsetX ?? 0,
      gridOffsetY: m.gridOffsetY ?? 0,
    }
  }

  // ─── Загрузка изображения / создание новой карты ─────────────────────────────
  async function uploadMapFile(file) {
    uploadingMap.value = true
    saveError.value = ''
    try {
      if (form.value.id) {
        // Замена изображения у существующей карты
        const updated = await store.replaceMapImage(form.value.id, file)
        form.value.imageUrl = updated.imageUrl
        form.value.imagePath = updated.imagePath
      } else {
        // Временно показываем превью через blob URL (карта ещё не создана)
        form.value.imageUrl = URL.createObjectURL(file)
        form.value._pendingFile = file
      }
    } catch (err) {
      saveError.value = err.message || 'Ошибка загрузки карты'
    } finally {
      uploadingMap.value = false
    }
  }

  // ─── Сохранение / обновление ─────────────────────────────────────────────────
  async function onSave(onSuccess) {
    if (!canSave.value) return
    saving.value = true
    saveError.value = ''
    try {
      if (form.value.id) {
        // Обновляем мета-данные (имя, cellSize)
        const updated = await store.updateMap(form.value.id, {
          name: form.value.name,
          cellSize: form.value.cellSize,
          gridOffsetX: form.value.gridOffsetX,
          gridOffsetY: form.value.gridOffsetY,
        })
        form.value.id = String(updated.id)
      } else {
        // Создаём новую карту (загрузка файла + мета-данные за один запрос)
        const file = form.value._pendingFile
        if (!file) {
          saveError.value = 'Файл карты не выбран'
          saving.value = false
          return
        }
        const created = await store.uploadMap(
          file,
          form.value.name,
          form.value.cellSize,
          form.value.gridOffsetX,
          form.value.gridOffsetY
        )
        // Заменяем blob URL на серверный
        if (form.value.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(form.value.imageUrl)
        form.value.id = String(created.id)
        form.value.imageUrl = created.imageUrl
        form.value.imagePath = created.imagePath
        delete form.value._pendingFile
      }
      onSuccess?.()
    } catch (err) {
      saveError.value = err.message || 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  // ─── Удаление текущей карты ───────────────────────────────────────────────────
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

  // Удаление из сайдбара — принимает объект карты
  async function onDeleteMap(m, resetFn) {
    if (!confirm(`Удалить «${m.name || 'Без названия'}»?`)) return
    saving.value = true
    saveError.value = ''
    try {
      await store.deleteMap(String(m.id))
      if (String(m.id) === form.value.id) resetFn?.()
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
    fillFormFromMap,
    uploadMapFile,
    onSave,
    onDelete,
    onDeleteMap,
  }
}

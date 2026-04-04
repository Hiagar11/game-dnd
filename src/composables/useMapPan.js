// Composable для перетаскивания карты правой кнопкой мыши.
// viewRef — ссылка на контейнер экрана, canvasRef — ссылка на canvas.
// canvas используется для размеров карты т.к. его width/height задаются явно через JS
// и не зависят от CSS или position родительского элемента.

import { ref, onMounted, onUnmounted } from 'vue'

export function useMapPan(viewRef, canvasRef) {
  // ref() — реактивные переменные: при их изменении Vue обновит шаблон.
  // Смещение карты относительно начального положения.
  const offsetX = ref(0)
  const offsetY = ref(0)

  // Обычные переменные (не ref) — не нужна реактивность, это внутреннее состояние.
  let isDragging = false
  let startX = 0
  let startY = 0

  function onMouseDown(e) {
    // e.button: 0 — левая, 1 — средняя, 2 — правая
    if (e.button !== 2) return

    isDragging = true
    // Запоминаем точку захвата с учётом текущего смещения карты,
    // чтобы карта не "прыгала" в начало при каждом новом захвате.
    startX = e.clientX - offsetX.value
    startY = e.clientY - offsetY.value
  }

  // Зажимаем значение val между min и max.
  // Например: clamp(-500, -300, 0) вернёт -300.
  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max)
  }

  function onMouseMove(e) {
    if (!isDragging) return

    const newX = e.clientX - startX
    const newY = e.clientY - startY

    // Получаем размеры экрана и карты для расчёта допустимых границ.
    // ?. — optional chaining: не упадёт если ref ещё не привязан к DOM.
    // ?? — nullish coalescing: запасное значение если первое null/undefined.
    const viewW = viewRef.value?.offsetWidth ?? window.innerWidth
    const viewH = viewRef.value?.offsetHeight ?? window.innerHeight

    // canvas.width/height — атрибуты IDL элемента, реальные пиксельные размеры буфера рисования.
    // Это не CSS-размер, а то что мы задали через canvas.width = img.naturalWidth.
    const mapW = canvasRef.value?.width ?? 0
    const mapH = canvasRef.value?.height ?? 0

    // Если карта ещё не загрузилась (mapW = 0) — не двигаем
    if (!mapW || !mapH) return

    // 10% правило: минимум 10% карты всегда остаётся на экране.
    // minX = -mapW * 0.9 — карта ушла влево, видно правые 10%
    // maxX = viewW - mapW * 0.1 — карта ушла вправо, видно левые 10%
    offsetX.value = clamp(newX, -mapW * 0.9, viewW - mapW * 0.1)
    offsetY.value = clamp(newY, -mapH * 0.9, viewH - mapH * 0.1)
  }

  function onMouseUp(e) {
    if (e.button !== 2) return
    isDragging = false
  }

  // stopDragging — общий сброс без проверки кнопки.
  // Вешается на window, чтобы ловить mouseup даже если курсор вышел за пределы страницы.
  function stopDragging() {
    isDragging = false
  }

  function onContextMenu(e) {
    // Запрещаем стандартное контекстное меню при правом клике
    e.preventDefault()
  }

  // onMounted/onUnmounted — вешаем и снимаем глобальные слушатели вместе с компонентом.
  // Важно снимать в onUnmounted — иначе будет утечка памяти после перехода на другую страницу.
  onMounted(() => {
    // mouseup на window — ловим отпускание кнопки в любом месте (адресная строка, другая вкладка)
    window.addEventListener('mouseup', stopDragging)
    // blur — окно потеряло фокус (например, переключились в другое приложение)
    window.addEventListener('blur', stopDragging)
  })

  onUnmounted(() => {
    window.removeEventListener('mouseup', stopDragging)
    window.removeEventListener('blur', stopDragging)
  })

  return { offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp, onContextMenu }
}

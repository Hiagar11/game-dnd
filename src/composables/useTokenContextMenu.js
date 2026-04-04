// Composable для управления контекстным меню токена.
//
// Используется паттерн "module-level ref" — реактивное состояние объявлено
// ВНЕ функции useTokenContextMenu, на уровне модуля.
// Это значит, что все компоненты, вызвавшие этот composable, получают
// ОДНУ и ту же копию state.
//
// uid — идентификатор токена, для которого открыто меню.
// Позиционирование полностью в CSS (position: absolute внутри токена),
// поэтому x, y координаты viewport больше не нужны.

import { ref } from 'vue'

const state = ref({
  visible: false,
  uid: null,
})

export function useTokenContextMenu() {
  function open(uid) {
    state.value = { visible: true, uid }
  }

  function close() {
    state.value.visible = false
  }

  return { state, open, close }
}

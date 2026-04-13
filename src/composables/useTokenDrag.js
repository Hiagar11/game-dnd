// Composable для начала перетаскивания токена из меню.
// Используется в GameMenuTokens: вешается на @dragstart кнопки токена.

export function useTokenDrag() {
  // dragstart вызывается браузером когда пользователь начинает тянуть элемент.
  // e.dataTransfer — объект для передачи данных между источником и целью drop.
  // setData(key, value) — записывает произвольные строковые данные.
  // Читается потом через getData(key) в обработчике drop.
  function onDragStart(e, token) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('tokenId', String(token.id))
    console.log('[drag] dragstart tokenId:', token.id, 'types:', [...e.dataTransfer.types])
  }

  return { onDragStart }
}

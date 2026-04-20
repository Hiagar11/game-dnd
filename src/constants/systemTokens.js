// Системные токены — статичные объекты, не хранятся в БД.
// id совпадает со значением поля systemToken в модели Scenario.
//
// src       — начальный вид
// srcOpened — вид после взаимодействия (сундук открыт / кувшин осмотрен)
// halfSize    — true если токен 1×2 суб-клетки (halfCell × cellSize)
// quarterSize — true если токен 1×1 суб-клетка  (halfCell × halfCell)

const ICON = 'https://api.iconify.design/game-icons/'

export const SYSTEM_TOKENS = [
  { id: 'door', name: 'Дверь', src: '/systemImage/door-system-token.webp' },
  {
    id: 'item',
    name: 'Сундук',
    src: `${ICON}locked-chest.svg?color=%23e2e8f0`,
    srcOpened: `${ICON}open-treasure-chest.svg?color=%23e2e8f0`,
  },
  {
    id: 'jar',
    name: 'Кувшин',
    src: `${ICON}amphora.svg?color=%23e2e8f0`,
    halfSize: true,
  },
  {
    id: 'bag',
    name: 'Мешочек',
    src: `${ICON}swap-bag.svg?color=%23e2e8f0`,
    quarterSize: true,
  },
]

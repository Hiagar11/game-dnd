import jwt from 'jsonwebtoken'

// Middleware для защиты роутов.
// Ожидает заголовок: Authorization: Bearer <token>
//
// Если токен валиден — добавляет req.user = { id, username, role }
// и передаёт управление следующему обработчику.
// Если нет — отвечает 401 без вызова next().
export function requireAuth(req, res, next) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Необходима авторизация' })
  }

  const token = header.slice(7) // убираем "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // Кладём данные пользователя на объект запроса для использования в роутах
    req.user = { id: payload.id, username: payload.username, role: payload.role }
    next()
  } catch {
    return res.status(401).json({ error: 'Токен недействителен или истёк' })
  }
}

// Middleware для проверки роли admin.
// Должен вызываться ПОСЛЕ requireAuth.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён' })
  }
  next()
}

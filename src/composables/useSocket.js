// Singleton-обёртка над Socket.io-клиентом.
// Один сокет на всё приложение — не создаём новое соединение при каждом вызове.
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

let _socket = null

export function useSocket() {
  /**
   * Подключиться к серверу с JWT-токеном.
   * Если сокет уже подключён — возвращаем существующий экземпляр.
   */
  function connect(token) {
    if (_socket?.connected) return _socket

    // Если сокет есть, но соединение разорвано — удаляем старый
    if (_socket) {
      _socket.disconnect()
      _socket = null
    }

    _socket = io(SOCKET_URL, {
      auth: { token },
      // autoConnect: true по умолчанию
    })

    return _socket
  }

  /** Получить текущий сокет без подключения (может быть null) */
  function getSocket() {
    return _socket
  }

  /** Отключиться и очистить singleton */
  function disconnect() {
    _socket?.disconnect()
    _socket = null
  }

  return { connect, disconnect, getSocket }
}

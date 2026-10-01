// Cliente de la API de Autia (backend/). La URL viene de VITE_API_URL y queda
// fija en el build (también dentro del APK). Si está vacía, la app funciona en
// modo local, solo con localStorage: es el respaldo si falla la red en la demo.

const BASE_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
const TIMEOUT_MS = 12000

export const API_ENABLED = BASE_URL !== ''

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const SIN_CONEXION = 'No pudimos conectar con el servidor. Revisa tu conexión a internet.'

/** Llama a la API. Lanza ApiError con el mensaje del servidor (status 0 si no hubo respuesta). */
export async function request(method, path, body, token) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(BASE_URL + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(res.status, data?.message || 'El servidor no pudo completar la acción.')
    return data
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(0, SIN_CONEXION)
  } finally {
    clearTimeout(timer)
  }
}

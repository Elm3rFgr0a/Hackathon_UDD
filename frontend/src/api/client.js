import axios from 'axios'

// En desarrollo Vite redirige /api → http://localhost:3000 (serverless-offline).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 4000,
})

/** Registra el perfil de una persona mayor en el backend. Devuelve null si la API no responde. */
export async function registerProfile({ nombreCompleto, rut, fechaNacimiento }) {
  try {
    const res = await api.post('/users', { nombreCompleto, rut, fechaNacimiento })
    return res.data?.data ?? null
  } catch {
    return null
  }
}

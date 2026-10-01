import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createSeed } from '../data/seed'
import { registerProfile } from '../api/client'
import { nearbyActivityId } from '../lib/selectors'

const STATE_KEY = 'cerca-state-v1'
const SESSION_KEY = 'cerca-session-v1'
const OFFSET_KEY = 'cerca-clock-offset'

const AppContext = createContext(null)

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const save = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible: la app sigue funcionando en memoria */
  }
}

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

/**
 * Reloj de la app. Para demostrar las notificaciones se puede simular la hora
 * con `?hora=13:05` en la URL (`?hora=real` vuelve a la hora real).
 */
function useClock() {
  const [offset, setOffset] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const hora = params.get('hora')
    if (hora === 'real') {
      save(OFFSET_KEY, null)
      return 0
    }
    if (hora && /^\d{1,2}:\d{2}$/.test(hora)) {
      const [h, m] = hora.split(':').map(Number)
      const target = new Date()
      target.setHours(h, m, 0, 0)
      const off = target.getTime() - Date.now()
      save(OFFSET_KEY, off)
      return off
    }
    return load(OFFSET_KEY, 0)
  })
  const [now, setNow] = useState(() => new Date(Date.now() + offset))

  useEffect(() => {
    setNow(new Date(Date.now() + offset))
    const id = setInterval(() => setNow(new Date(Date.now() + offset)), 15000)
    return () => clearInterval(id)
  }, [offset])

  const resetClock = useCallback(() => {
    save(OFFSET_KEY, null)
    setOffset(0)
  }, [])

  return { now, offset, simulated: offset !== 0, resetClock }
}

export function AppProvider({ children }) {
  const { now, offset, simulated, resetClock } = useClock()
  const [state, setState] = useState(() => load(STATE_KEY, null) || createSeed(new Date(Date.now() + load(OFFSET_KEY, 0))))
  const [session, setSession] = useState(() => load(SESSION_KEY, null))
  const offsetRef = useRef(offset)
  offsetRef.current = offset
  // Marca de tiempo según el reloj de la app (respeta la hora simulada).
  const stamp = useCallback(() => new Date(Date.now() + offsetRef.current).toISOString(), [])

  useEffect(() => save(STATE_KEY, state), [state])
  useEffect(() => save(SESSION_KEY, session), [session])

  const update = useCallback((fn) => setState((s) => ({ ...s, ...fn(s) })), [])

  const login = useCallback(
    (email, password) => {
      const acc = state.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
      if (!acc || acc.password !== password) return { ok: false, error: 'El correo o la contraseña no coinciden.' }
      const next = { rol: acc.rol, personId: acc.personId, selectedElderId: acc.rol === 'adulto' ? acc.personId : null }
      setSession(next)
      return { ok: true, rol: acc.rol }
    },
    [state.accounts],
  )

  const logout = useCallback(() => setSession(null), [])

  const selectElder = useCallback((id) => setSession((s) => ({ ...s, selectedElderId: id })), [])

  const resetDemo = useCallback(() => {
    resetClock()
    setState(createSeed(new Date()))
    setSession(null)
  }, [resetClock])

  const actions = useMemo(
    () => ({
      takeDose: ({ medId, iso, time }) =>
        update((s) => ({ intakes: { ...s.intakes, [`${medId}|${iso}|${time}`]: { at: stamp() } } })),

      undoDose: ({ medId, iso, time }) =>
        update((s) => {
          const intakes = { ...s.intakes }
          delete intakes[`${medId}|${iso}|${time}`]
          return { intakes }
        }),

      setAttendance: (actId, elderId, value) =>
        update((s) => ({ attendance: { ...s.attendance, [`${actId}|${elderId}`]: { value, at: stamp() } } })),

      addActivity: (data, creatorId) => {
        const activity = { id: uid(data.tipo === 'consulta' ? 'c' : 'a'), createdAt: stamp(), creadoPor: creatorId, ...data }
        update((s) => ({ activities: [...s.activities, activity] }))
        return activity
      },

      removeActivity: (id) => update((s) => ({ activities: s.activities.filter((a) => a.id !== id) })),

      addNearbyToAgenda: (event, elderId) => {
        const id = nearbyActivityId(event.id, elderId)
        update((s) =>
          s.activities.some((a) => a.id === id)
            ? {}
            : {
                activities: [
                  ...s.activities,
                  {
                    id, origenCerca: event.id, elderIds: [elderId], tipo: 'actividad', icono: 'pin',
                    titulo: event.titulo, fecha: event.fecha, hora: event.hora, lugar: event.lugar,
                    con: event.organizador, creadoPor: elderId, createdAt: stamp(),
                  },
                ],
              },
        )
        return id
      },

      saveMedication: (med) =>
        update((s) => {
          if (med.id && s.medications.some((m) => m.id === med.id)) {
            return { medications: s.medications.map((m) => (m.id === med.id ? { ...m, ...med } : m)) }
          }
          return { medications: [...s.medications, { ...med, id: uid('m') }] }
        }),

      removeMedication: (id) => update((s) => ({ medications: s.medications.filter((m) => m.id !== id) })),

      addElder: async (data) => {
        // Se registra en el backend (POST /users); si no está disponible, queda local.
        const remote = await registerProfile({
          nombreCompleto: `${data.nombre} ${data.apellido}`,
          rut: data.rut,
          fechaNacimiento: data.fechaNacimiento,
        })
        const elder = { id: remote?.idUsuario || uid('e'), color: 'blue', ...data }
        update((s) => ({ elders: [...s.elders, elder] }))
        return elder
      },

      updateElder: (id, data) => update((s) => ({ elders: s.elders.map((e) => (e.id === id ? { ...e, ...data } : e)) })),

      inviteMember: (data) =>
        update((s) => ({ members: [...s.members, { id: uid('u'), estado: 'invitado', ...data }] })),

      markSeen: (viewerKey, ids) =>
        update((s) => {
          const seen = { ...s.seen }
          for (const id of ids) seen[`${viewerKey}|${id}`] = true
          return { seen }
        }),
    }),
    [update, stamp],
  )

  const value = useMemo(
    () => ({ state, now, simulated, resetClock, session, login, logout, selectElder, resetDemo, ...actions }),
    [state, now, simulated, resetClock, session, login, logout, selectElder, resetDemo, actions],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

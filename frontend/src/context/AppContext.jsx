import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createSeed } from '../data/seed'
import { nearbyActivityId } from '../lib/selectors'
import { API_ENABLED, request } from '../api/client'

// En modo API se usan claves propias para no mezclar con los datos del modo local.
const STATE_KEY = API_ENABLED ? 'cerca-api-state-v1' : 'cerca-state-v1'
const SESSION_KEY = API_ENABLED ? 'cerca-api-session-v1' : 'cerca-session-v1'
const OFFSET_KEY = 'cerca-clock-offset'
const CLOCK_APPLIED_KEY = 'cerca-clock-applied'
const SYNC_MS = 15000
const ERROR_MS = 6000
const MAX_VISTOS = 200

// Estado vacío con la misma forma que devuelve GET /estado.
const EMPTY_STATE = { elders: [], members: [], medications: [], activities: [], nearby: [], intakes: {}, attendance: {}, omissions: {}, seen: {} }

// Si la URL trae ?hora=, esa hora manda sobre el reloj compartido del servidor.
const URL_HAS_HORA = new URLSearchParams(window.location.search).has('hora')

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

  /** Fija el desfase (ms) respecto de la hora real. */
  const setOffsetMs = useCallback((off) => {
    save(OFFSET_KEY, off || null)
    setOffset(off || 0)
  }, [])

  /** Fija la hora del día ("HH:MM") como si fuera ahora. Devuelve la hora simulada. */
  const setClock = useCallback((hhmm) => {
    const [h, m] = hhmm.split(':').map(Number)
    const target = new Date()
    target.setHours(h, m, 0, 0)
    setOffsetMs(target.getTime() - Date.now())
    return target
  }, [setOffsetMs])

  return { now, offset, simulated: offset !== 0, resetClock, setClock, setOffsetMs }
}

/** Pantalla mientras llega el primer estado del servidor (o si no se pudo cargar). */
function LoadingScreen({ error, onRetry, onExit }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28, background: '#FBF8F2', color: '#1B2430', textAlign: 'center' }}>
      <p role="status" style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{error ? 'No pudimos cargar tus datos' : 'Cargando…'}</p>
      {error && (
        <>
          <p style={{ fontSize: 20, margin: 0, color: '#566170' }}>{error}</p>
          <button type="button" onClick={onRetry} style={{ minHeight: 64, padding: '0 32px', border: 0, borderRadius: 16, background: '#0B5F66', color: '#fff', fontSize: 22, fontWeight: 700 }}>Reintentar</button>
          <button type="button" onClick={onExit} style={{ border: 0, background: 'none', color: '#0B5F66', fontSize: 18, textDecoration: 'underline' }}>Volver al inicio de sesión</button>
        </>
      )}
    </main>
  )
}

/** Aviso cuando una acción no se pudo guardar en el servidor. */
function SyncError({ message, onClose }) {
  return (
    <div role="alert" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 1000, display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px', borderRadius: 14, background: '#6F2907', color: '#fff', fontSize: 17, boxShadow: '0 4px 16px rgba(0,0,0,.25)' }}>
      <span style={{ flexGrow: 1 }}>{message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar aviso" style={{ border: 0, background: 'none', color: '#fff', fontSize: 24, lineHeight: 1 }}>×</button>
    </div>
  )
}

export function AppProvider({ children }) {
  const { now, offset, simulated, resetClock, setClock, setOffsetMs } = useClock()
  const [state, setState] = useState(() =>
    API_ENABLED ? load(STATE_KEY, null) || EMPTY_STATE : load(STATE_KEY, null) || createSeed(new Date(Date.now() + load(OFFSET_KEY, 0))),
  )
  const [session, setSession] = useState(() => load(SESSION_KEY, null))
  // En modo API, true cuando ya hay datos que mostrar (del servidor o del caché).
  const [loaded, setLoaded] = useState(() => !API_ENABLED || load(STATE_KEY, null) !== null)
  const [syncError, setSyncError] = useState(null)

  const offsetRef = useRef(offset)
  offsetRef.current = offset
  const stateRef = useRef(state)
  stateRef.current = state
  const sessionRef = useRef(session)
  sessionRef.current = session
  const pending = useRef(0) // acciones enviadas y aún sin respuesta
  const queue = useRef(Promise.resolve()) // las acciones se envían en orden
  const urlHoraPending = useRef(URL_HAS_HORA)

  // Marca de tiempo según el reloj de la app (respeta la hora simulada).
  const stamp = useCallback(() => new Date(Date.now() + offsetRef.current).toISOString(), [])

  // Los efectos no deben devolver valores: React los trata como función de limpieza.
  useEffect(() => {
    save(STATE_KEY, state)
  }, [state])
  useEffect(() => {
    save(SESSION_KEY, session)
  }, [session])
  useEffect(() => {
    if (!syncError) return undefined
    const id = setTimeout(() => setSyncError(null), ERROR_MS)
    return () => clearTimeout(id)
  }, [syncError])

  const update = useCallback((fn) => setState((s) => ({ ...s, ...fn(s) })), [])

  const clearData = useCallback(() => {
    save(STATE_KEY, null)
    setState(EMPTY_STATE)
    setLoaded(false)
  }, [])

  const logout = useCallback(() => {
    setSession(null)
    if (API_ENABLED) clearData()
  }, [clearData])

  const handleError = useCallback((err) => {
    if (err.status === 401 && sessionRef.current) {
      logout()
      setSyncError('Tu sesión expiró. Vuelve a ingresar.')
      return
    }
    setSyncError(err.message)
  }, [logout])

  /** Adopta la hora de demo del último reset (una vez por reset), salvo que la URL traiga ?hora=. */
  const applyServerClock = useCallback((reloj) => {
    if (!reloj?.desde || load(CLOCK_APPLIED_KEY, null) === reloj.desde) return
    save(CLOCK_APPLIED_KEY, reloj.desde)
    if (urlHoraPending.current) {
      urlHoraPending.current = false
      return
    }
    setOffsetMs(reloj.offsetMs)
  }, [setOffsetMs])

  /** Trae el estado del servidor. No lo aplica si hay acciones en curso: se pedirá de nuevo al terminar. */
  const refresh = useCallback(async () => {
    const s = sessionRef.current
    // El personal del ELEAM no tiene grupo: su pantalla pide la ronda por su cuenta.
    if (!API_ENABLED || !s?.token || s.rol === 'eleam') return
    try {
      const data = await request('GET', '/estado', undefined, s.token)
      if (pending.current > 0 || sessionRef.current !== s) return
      setState(data)
      setLoaded(true)
      applyServerClock(data.reloj)
    } catch (err) {
      handleError(err)
    }
  }, [applyServerClock, handleError])

  /** Envía una acción al servidor, en orden. Si falla, el siguiente refresh vuelve al estado real. */
  const send = useCallback((method, path, body) => {
    if (!API_ENABLED) return
    const token = sessionRef.current?.token
    pending.current += 1
    queue.current = queue.current
      .then(() => request(method, path, body, token))
      .catch(handleError)
      .finally(() => {
        pending.current -= 1
        if (pending.current === 0) refresh()
      })
  }, [handleError, refresh])

  // Sincronización: al iniciar sesión, cada 15 s y al volver a la app.
  useEffect(() => {
    if (!API_ENABLED || !session?.token) return undefined
    refresh()
    const id = setInterval(refresh, SYNC_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [session?.token, refresh])

  const login = useCallback(async (email, password) => {
    if (!API_ENABLED) {
      const acc = stateRef.current.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
      if (!acc || acc.password !== password) return { ok: false, error: 'El correo o la contraseña no coinciden.' }
      setSession({ rol: acc.rol, personId: acc.personId, selectedElderId: acc.rol === 'adulto' ? acc.personId : null })
      return { ok: true, rol: acc.rol }
    }
    try {
      const { token, sesion } = await request('POST', '/auth/login', { email: email.trim(), password })
      clearData()
      setSession({ ...sesion, token })
      return { ok: true, rol: sesion.rol }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }, [clearData])

  const selectElder = useCallback((id) => setSession((s) => ({ ...s, selectedElderId: id })), [])

  /** Reinicia los datos de ejemplo como si fueran las `hhmm` de hoy (sin hora: la real). */
  const resetDemo = useCallback(async (hhmm) => {
    let target
    if (hhmm) target = setClock(hhmm)
    else {
      resetClock()
      target = new Date()
    }
    setSession(null)
    if (!API_ENABLED) {
      setState(createSeed(target))
      return { ok: true }
    }
    clearData()
    try {
      await request('POST', '/demo/reset', { now: target.toISOString() })
      return { ok: true }
    } catch (err) {
      setSyncError(err.message)
      return { ok: false, error: err.message }
    }
  }, [resetClock, setClock, clearData])

  // Cada acción actualiza la pantalla al instante y, en modo API, se envía al servidor.
  const actions = useMemo(
    () => ({
      takeDose: ({ medId, iso, time }) => {
        const at = stamp()
        update((s) => ({ intakes: { ...s.intakes, [`${medId}|${iso}|${time}`]: { at } } }))
        send('PUT', '/tomas', { medId, fecha: iso, hora: time, at })
      },

      undoDose: ({ medId, iso, time }) => {
        update((s) => {
          const intakes = { ...s.intakes }
          delete intakes[`${medId}|${iso}|${time}`]
          return { intakes }
        })
        send('DELETE', '/tomas', { medId, fecha: iso, hora: time })
      },

      setAttendance: (actId, elderId, value) => {
        const at = stamp()
        update((s) => ({ attendance: { ...s.attendance, [`${actId}|${elderId}`]: { value, at } } }))
        send('PUT', '/asistencias', { eventoId: actId, personaId: elderId, value, at })
      },

      addActivity: (data, creatorId) => {
        const activity = { id: uid(data.tipo === 'consulta' ? 'c' : 'a'), createdAt: stamp(), creadoPor: creatorId, ...data }
        update((s) => ({ activities: [...s.activities, activity] }))
        send('POST', '/eventos', activity)
        return activity
      },

      removeActivity: (id) => {
        update((s) => ({ activities: s.activities.filter((a) => a.id !== id) }))
        send('DELETE', `/eventos/${encodeURIComponent(id)}`)
      },

      addNearbyToAgenda: (event, elderId) => {
        const id = nearbyActivityId(event.id, elderId)
        const at = stamp()
        update((s) =>
          s.activities.some((a) => a.id === id)
            ? {}
            : {
                activities: [
                  ...s.activities,
                  {
                    id, origenCerca: event.id, elderIds: [elderId], tipo: 'actividad', icono: 'pin',
                    titulo: event.titulo, fecha: event.fecha, hora: event.hora, lugar: event.lugar,
                    con: event.organizador, creadoPor: elderId, createdAt: at,
                  },
                ],
              },
        )
        send('POST', `/cerca/${encodeURIComponent(event.id)}/sumar`, { personaId: elderId, at })
        return id
      },

      saveMedication: (med) => {
        const exists = Boolean(med.id) && stateRef.current.medications.some((m) => m.id === med.id)
        const id = exists ? med.id : uid('m')
        update((s) => (exists
          ? { medications: s.medications.map((m) => (m.id === id ? { ...m, ...med } : m)) }
          : { medications: [...s.medications, { ...med, id }] }))
        if (exists) send('PUT', `/medicamentos/${encodeURIComponent(id)}`, med)
        else send('POST', '/medicamentos', { ...med, id })
      },

      /** "Ya compré": suma unidades al stock del remedio. */
      registerPurchase: (medId, unidades) => {
        update((s) => ({
          medications: s.medications.map((m) => {
            if (m.id !== medId) return m
            const consumo = (m.unidadesPorToma ?? 1) * m.horarios.length
            if (typeof m.stockUnidades !== 'number') {
              // Modo local: el stock se lleva en días.
              return { ...m, stockDias: m.stockDias + (consumo ? Math.floor(unidades / consumo) : 0) }
            }
            const stockUnidades = m.stockUnidades + unidades
            const dias = consumo ? Math.floor(stockUnidades / consumo) : m.stockDias
            const semaforo = dias <= 3 ? 'rojo' : dias <= (m.umbralDias ?? 7) ? 'amarillo' : 'verde'
            return { ...m, stockUnidades, stockDias: dias, semaforo }
          }),
        }))
        send('POST', `/medicamentos/${encodeURIComponent(medId)}/compras`, { unidades, at: stamp() })
      },

      removeMedication: (id) => {
        update((s) => ({ medications: s.medications.filter((m) => m.id !== id) }))
        send('DELETE', `/medicamentos/${encodeURIComponent(id)}`)
      },

      addElder: (data) => {
        const elder = { id: uid('e'), color: 'blue', ...data }
        update((s) => ({ elders: [...s.elders, elder] }))
        send('POST', '/personas', elder)
        return elder
      },

      updateElder: (id, data) => {
        const current = stateRef.current.elders.find((e) => e.id === id)
        update((s) => ({ elders: s.elders.map((e) => (e.id === id ? { ...e, ...data } : e)) }))
        send('PUT', `/personas/${encodeURIComponent(id)}`, { ...current, ...data })
      },

      inviteMember: (data) => {
        const member = { id: uid('u'), estado: 'invitado', ...data }
        update((s) => ({ members: [...s.members, member] }))
        send('POST', '/miembros', member)
      },

      markSeen: (viewerKey, ids) => {
        const nuevos = ids.filter((id) => !stateRef.current.seen[`${viewerKey}|${id}`])
        if (!nuevos.length) return
        update((s) => {
          const seen = { ...s.seen }
          for (const id of nuevos) seen[`${viewerKey}|${id}`] = true
          return { seen }
        })
        for (let i = 0; i < nuevos.length; i += MAX_VISTOS) send('POST', '/vistos', { ids: nuevos.slice(i, i + MAX_VISTOS) })
      },
    }),
    [update, stamp, send],
  )

  const value = useMemo(
    () => ({ state, now, simulated, resetClock, session, login, logout, selectElder, resetDemo, apiEnabled: API_ENABLED, handleApiError: handleError, applyServerClock, ...actions }),
    [state, now, simulated, resetClock, session, login, logout, selectElder, resetDemo, handleError, applyServerClock, actions],
  )

  const blocking = API_ENABLED && Boolean(session?.token) && session?.rol !== 'eleam' && !loaded

  return (
    <AppContext.Provider value={value}>
      {blocking ? <LoadingScreen error={syncError} onRetry={refresh} onExit={logout} /> : children}
      {syncError && !blocking && <SyncError message={syncError} onClose={() => setSyncError(null)} />}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

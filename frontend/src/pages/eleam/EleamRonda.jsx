import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Avatar, Chip } from '../../components/common'
import { useApp } from '../../context/AppContext'
import { API_ENABLED, request } from '../../api/client'
import { longDate, toHHMM, toISODate } from '../../lib/dates'
import { MOTIVOS_CORTOS } from '../../lib/selectors'

const SYNC_MS = 15000
const TONO_STOCK = { rojo: 'far', amarillo: 'warn', verde: 'muted' }

/** La ronda que corresponde ahora: la última hora ya llegada con dosis pendientes; si no hay, la próxima. */
function rondaActual(data, ahora) {
  const pendientes = (h) => data.dosis.some((d) => d.hora === h && d.estado === 'pendiente')
  const llegadas = data.horas.filter((h) => h <= ahora)
  return [...llegadas].reverse().find(pendientes) ?? data.horas.find((h) => h > ahora) ?? data.horas[data.horas.length - 1]
}

function EstadoDosis({ d }) {
  if (d.estado === 'dada') return <Chip tone="ok" icon="check">Dada{d.at ? ` ${toHHMM(new Date(d.at))}` : ''}</Chip>
  if (d.estado === 'omitida') return <Chip tone="far" icon="x">No se dio · {MOTIVOS_CORTOS[d.motivo] ?? d.motivo}</Chip>
  return <Chip tone="muted" icon="clock">Pendiente</Chip>
}

/**
 * Ronda de remedios del ELEAM: todas las dosis de una hora, de todos los
 * residentes. Un solo botón las marca como dadas; lo que falló se registra
 * como excepción, con su motivo, y se avisa a la familia.
 */
export default function EleamRonda() {
  const { session, now, logout, handleApiError, applyServerClock } = useApp()
  const navigate = useNavigate()
  const fecha = toISODate(now)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [hora, setHora] = useState(null)
  const [excepciones, setExcepciones] = useState({}) // medId → motivo
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const enviandoRef = useRef(false)

  const cargar = useCallback(async () => {
    if (!API_ENABLED || enviandoRef.current) return
    try {
      const r = await request('GET', `/eleam/ronda?fecha=${fecha}`, undefined, session.token)
      setData(r)
      setError('')
      applyServerClock(r.reloj)
    } catch (err) {
      if (err.status === 401) return handleApiError(err)
      setError(err.message)
    }
  }, [fecha, session.token, handleApiError, applyServerClock])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, SYNC_MS)
    return () => clearInterval(id)
  }, [cargar])

  // Al llegar los datos por primera vez, se abre la ronda que corresponde a esta hora.
  useEffect(() => {
    if (data && !hora) setHora(rondaActual(data, toHHMM(now)))
  }, [data, hora, now])

  const residentes = useMemo(() => new Map((data?.residentes ?? []).map((r) => [r.id, r])), [data])
  const dosis = useMemo(() => (data?.dosis ?? []).filter((d) => d.hora === hora), [data, hora])
  const porResidente = useMemo(() => {
    const grupos = new Map()
    for (const d of dosis) {
      if (!grupos.has(d.personaId)) grupos.set(d.personaId, [])
      grupos.get(d.personaId).push(d)
    }
    return [...grupos.entries()]
  }, [dosis])

  const pendientes = dosis.filter((d) => d.estado === 'pendiente')
  const nExcepciones = pendientes.filter((d) => excepciones[d.medId]).length
  const aDar = pendientes.length - nExcepciones

  const salir = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const alternar = (medId) =>
    setExcepciones((e) => {
      const nuevo = { ...e }
      if (nuevo[medId]) delete nuevo[medId]
      else nuevo[medId] = 'rechazo'
      return nuevo
    })

  const marcar = async () => {
    if (!pendientes.length || enviando) return
    enviandoRef.current = true
    setEnviando(true)
    setResultado(null)
    try {
      const r = await request('POST', '/eleam/ronda/marcar', {
        fecha, hora, at: now.toISOString(),
        excepciones: pendientes.filter((d) => excepciones[d.medId]).map((d) => ({ medId: d.medId, motivo: excepciones[d.medId] })),
      }, session.token)
      setResultado(r)
      setExcepciones({})
    } catch (err) {
      if (err.status === 401) return handleApiError(err)
      setError(err.message)
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
    cargar()
  }

  const header = (
    <header className="f-bar">
      <div className="f-bar__title">
        <span className="f-tile__icon" aria-hidden="true"><Icon name="home" /></span>
        <h1>
          Ronda de remedios
          <small>{data ? `${data.establecimiento.nombre}${data.personal ? ` · ${data.personal.nombre}` : ''}` : 'ELEAM'}</small>
        </h1>
      </div>
      <button type="button" className="f-icon-btn" aria-label="Cerrar sesión" onClick={salir}><Icon name="logout" /></button>
    </header>
  )

  if (!API_ENABLED) {
    return (
      <>
        {header}
        <main className="f-main"><p className="f-empty">La vista del ELEAM necesita conexión con el servidor.</p></main>
      </>
    )
  }

  return (
    <>
      {header}
      <main className="f-main eleam">
        <div className="f-h2"><h2 style={{ fontSize: 18 }}>{longDate(fecha)}</h2>{data && <span className="f-meta">{data.residentes.length} residentes</span>}</div>

        {error && <p className="form-error" role="alert"><Icon name="alert" size={20} />{error}</p>}
        {!data && !error && <p className="f-empty" role="status">Cargando la ronda…</p>}

        {data && (
          <>
            <div className="eleam-horas" role="group" aria-label="Hora de la ronda">
              {data.horas.map((h) => {
                const pend = data.dosis.filter((d) => d.hora === h && d.estado === 'pendiente').length
                return (
                  <button key={h} type="button" aria-pressed={h === hora} onClick={() => { setHora(h); setResultado(null) }}>
                    <span className="eleam-horas__h">{h}</span>
                    <span className="eleam-horas__n">{pend ? `${pend} pend.` : 'Lista'}</span>
                  </button>
                )
              })}
            </div>

            {resultado && (
              <div className="eleam-ok" role="status">
                <Icon name="check" size={22} stroke={3} />
                <p>
                  <strong>Ronda de las {resultado.hora} registrada.</strong>{' '}
                  {resultado.dadas} {resultado.dadas === 1 ? 'dosis dada' : 'dosis dadas'}
                  {resultado.omitidas > 0 && `, ${resultado.omitidas} no ${resultado.omitidas === 1 ? 'dada' : 'dadas'}`}.
                  {resultado.alertas > 0 && ` Avisamos a la familia (${resultado.alertas} ${resultado.alertas === 1 ? 'alerta' : 'alertas'}).`}
                </p>
              </div>
            )}

            {dosis.length === 0 ? (
              <p className="f-empty">No hay dosis a esta hora.</p>
            ) : (
              <ul className="f-section" style={{ listStyle: 'none' }}>
                {porResidente.map(([personaId, lista]) => {
                  const r = residentes.get(personaId)
                  return (
                    <li key={personaId} className="f-card">
                      <div className="f-tile">
                        <Avatar person={r} size={44} />
                        <strong style={{ fontSize: 17, flex: 1 }}>{r ? `${r.nombre} ${r.apellido}` : personaId}</strong>
                      </div>
                      <ul className="f-list" style={{ marginTop: 8 }}>
                        {lista.map((d) => {
                          const falla = d.estado === 'pendiente' && excepciones[d.medId]
                          return (
                            <li key={d.medId} className="eleam-dosis">
                              <div className="f-row" style={{ paddingBottom: falla ? 4 : 12 }}>
                                <span className="f-row__main">
                                  <span className="f-row__title" style={{ display: 'block' }}>{d.nombre} {d.dosis}</span>
                                  <span className="f-row__sub">{d.cantidad}{d.indicacion ? ` · ${d.indicacion}` : ''}</span>
                                  <span className="chips" style={{ marginTop: 6 }}>
                                    <EstadoDosis d={d} />
                                    {d.stockDias !== null && (
                                      <Chip tone={TONO_STOCK[d.semaforo]} icon={d.semaforo === 'rojo' ? 'alert' : 'box'}>
                                        {d.stockDias === 1 ? '1 día' : `${d.stockDias} días`}
                                      </Chip>
                                    )}
                                  </span>
                                </span>
                                {d.estado === 'pendiente' && (
                                  <button type="button" className={`eleam-falla${falla ? ' eleam-falla--on' : ''}`} aria-pressed={!!falla} onClick={() => alternar(d.medId)}>
                                    <Icon name="x" size={16} stroke={2.5} />No se dio
                                  </button>
                                )}
                              </div>
                              {falla && (
                                <div className="field eleam-motivo">
                                  <label htmlFor={`mot-${d.medId}`}>Motivo</label>
                                  <select id={`mot-${d.medId}`} className="input" value={excepciones[d.medId]}
                                    onChange={(e) => setExcepciones((x) => ({ ...x, [d.medId]: e.target.value }))}>
                                    {Object.entries(data.motivos).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                                  </select>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </main>

      {data && pendientes.length > 0 && (
        <div className="eleam-accion">
          <button type="button" className="btn btn--primary" onClick={marcar} disabled={enviando}>
            <Icon name="check" size={20} stroke={2.5} />
            {enviando ? 'Registrando…' : aDar > 0 ? `Marcar ${aDar} como ${aDar === 1 ? 'dada' : 'dadas'}` : 'Registrar dosis no dadas'}
          </button>
          {nExcepciones > 0 && (
            <p className="f-meta" style={{ textAlign: 'center' }}>
              {nExcepciones} {nExcepciones === 1 ? 'queda' : 'quedan'} como no {nExcepciones === 1 ? 'dada' : 'dadas'} y se avisa a su familia.
            </p>
          )}
        </div>
      )}
    </>
  )
}

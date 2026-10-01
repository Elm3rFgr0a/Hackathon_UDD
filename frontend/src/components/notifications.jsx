import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { buildNotifications, dueNotifications, scheduledNotifications } from '../lib/notifications'
import { haceCuanto, toHHMM, HOUR, MINUTE } from '../lib/dates'
import { elderById } from '../lib/selectors'
import { Icon } from './Icon'

/** Avisos de quien tiene la sesión abierta, más las acciones para responderlos. */
export function useNotifications() {
  const app = useApp()
  const { state, now, session } = app
  const navigate = useNavigate()
  const audience = session?.rol
  const viewerId = session?.personId

  const elderIds = useMemo(
    () => (!session ? [] : audience === 'adulto' ? [viewerId] : state.elders.map((e) => e.id)),
    [session, audience, viewerId, state.elders],
  )
  const all = useMemo(
    () => (session ? buildNotifications(state, now, { audience, elderIds, viewerId }) : []),
    [state, now, session, audience, elderIds, viewerId],
  )

  const due = useMemo(() => dueNotifications(all, now), [all, now])
  // El familiar también ve lo que se le enviará a cada adulto mayor.
  const scheduled = useMemo(() => {
    if (audience !== 'familiar') return scheduledNotifications(all, now)
    const forElders = buildNotifications(state, now, { audience: 'adulto', elderIds, viewerId })
    return scheduledNotifications([...all, ...forElders], now)
  }, [all, now, audience, state, elderIds, viewerId])
  const isSeen = (n) => !!state.seen[`${viewerId}|${n.id}`]
  const unread = due.filter((n) => !isSeen(n) && !n.resolved)

  const markSeen = (ids) => app.markSeen(viewerId, ids)

  const run = (n, action) => {
    const { type, payload } = action
    if (type === 'take') app.takeDose(payload)
    if (type === 'attend') app.setAttendance(payload.actId, n.elderId, payload.value)
    if (type === 'call') window.location.href = `tel:${payload}`
    if (type === 'link') {
      if (audience === 'familiar') app.selectElder(n.elderId)
      navigate(payload)
    }
    markSeen([n.id])
  }

  return { all, due, scheduled, unread, isSeen, markSeen, run }
}

export function NotificationCard({ n, big = false, unread = false, onAction, now, showTiming = true, showElder = false, interactive = true }) {
  const { state } = useApp()
  const elder = showElder ? elderById(state, n.elderId) : null
  const when = n.at <= now ? haceCuanto(n.at, now) : `a las ${toHHMM(n.at)}`
  // Un botón para «ir a ver» deja de servir pasadas 2 h; responder (tomé / asistí) sigue sirviendo.
  const actions = n.actions.filter((a) => a.type !== 'link' || now - n.at < 2 * HOUR)
  return (
    <article className={`notice theme-${n.section}${big ? ' notice--big' : ''}${unread ? ' notice--unread' : ''}`}>
      {showTiming && (
        <span className="timing">
          <Icon name="clock" size={big ? 16 : 13} stroke={2.5} />
          {n.timing}
        </span>
      )}
      <div className="notice__head">
        <span className="app-glyph"><Icon name="heart" size={big ? 16 : 12} stroke={2.5} /></span>
        <strong>Cerca</strong>
        {elder && <span>· {n.audience === 'adulto' ? `para ${elder.nombre}` : elder.nombre}</span>}
        <span className="grow" />
        <span>{when}</span>
      </div>
      <h3 className="notice__title">{n.title}</h3>
      <p className="notice__body">{n.body}</p>
      {n.resolved ? (
        <span className="notice__resolved">
          <Icon name="check" size={big ? 22 : 16} stroke={3} />
          {n.resolvedLabel || 'Listo'}
        </span>
      ) : (
        interactive && actions.length > 0 && (
          <div className={big ? 'e-btn-row' : 'notice__actions'}>
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                className={
                  big
                    ? `e-btn press ${a.primary ? 'e-btn--primary' : 'e-btn--outline'}`
                    : `btn ${a.primary ? 'btn--primary' : 'btn--secondary'}`
                }
                onClick={() => onAction?.(n, a)}
              >
                {a.label}
              </button>
            ))}
          </div>
        )
      )}
    </article>
  )
}

// Avisos ya mostrados como emergentes en esta sesión del navegador.
const toasted = new Set()

/**
 * Muestra arriba, como una notificación push, el aviso que se acaba de
 * disparar (hace menos de 15 min). Se oculta solo a los 20 s y queda en
 * «Avisos» hasta que se lea. Si el usuario lo permitió y la app está en
 * segundo plano, también sale como notificación del sistema.
 */
export function NotificationHost({ big = false }) {
  const { now } = useApp()
  const { unread, run, markSeen } = useNotifications()
  const [, rerender] = useState(0)
  const current = unread.find((n) => now - n.at < 15 * MINUTE && !toasted.has(n.id))

  const hide = (id) => {
    toasted.add(id)
    rerender((x) => x + 1)
  }

  useEffect(() => {
    if (!current) return undefined
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        new Notification(current.title, { body: current.body, tag: current.id })
      }
    } catch {
      /* algunos navegadores móviles solo permiten notificaciones vía service worker */
    }
    const t = setTimeout(() => hide(current.id), 20000)
    return () => clearTimeout(t)
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className="toast">
        <NotificationCard n={current} big={big} onAction={(n, a) => { hide(n.id); run(n, a) }} now={now} showTiming={false} />
        <button type="button" className="toast__close" aria-label="Cerrar aviso" onClick={() => { hide(current.id); markSeen([current.id]) }}>
          <Icon name="x" size={big ? 28 : 22} stroke={2.5} />
        </button>
      </div>
    </div>
  )
}

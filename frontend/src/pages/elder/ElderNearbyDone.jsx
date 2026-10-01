import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Falta } from '../../components/common'
import { daysBetween, longDate, toISODate } from '../../lib/dates'
import { Distance } from './ElderNearby'
import { useElder } from './parts'

export default function ElderNearbyDone() {
  const { state, now } = useElder()
  const { eventId } = useParams()
  const ev = state.nearby.find((n) => n.id === eventId)
  if (!ev) return <Navigate to="/adulto/cerca" replace />
  const event = { ...ev, walk: ev.minutosCaminando <= 20 }

  return (
    <main className="e-page theme-cer">
      <span className="e-done-mark"><Icon name="check" size={72} stroke={4} /></span>
      <h1 className="e-done-title">¡Listo! Lo sumamos a tu día</h1>
      <section className="e-card">
        <div className="e-name">{ev.titulo}</div>
        <div className="e-sub" style={{ color: 'var(--ink)', fontSize: 24 }}>{longDate(ev.fecha)} · {ev.hora}</div>
        <div className="e-sub">{ev.lugar}</div>
        <Distance event={event} />
        <Falta days={daysBetween(toISODate(now), ev.fecha)} que="la actividad" />
      </section>
      <p className="e-sub">Te avisaremos 1 hora antes. Tu familia también lo verá en su agenda.</p>
      <div className="e-push">
        <Link to="/adulto/proximos" className="e-btn e-btn--primary press">
          <Icon name="calendar" size={32} stroke={2.5} />
          Ver próximos días
        </Link>
        <Link to="/adulto/cerca" className="e-btn e-btn--outline press">Seguir viendo</Link>
      </div>
    </main>
  )
}

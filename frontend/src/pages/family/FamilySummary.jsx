import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Chip } from '../../components/common'
import { daysBetween, enCuanto, relativeDay, toISODate } from '../../lib/dates'
import { MOTIVOS_CORTOS, activityStatus, dosesForDay, eventsOn, lowStock, personName, upcomingAppointments } from '../../lib/selectors'
import FamilyShell, { useFamily } from './FamilyShell'

export function DoseChip({ dose, now }) {
  if (dose.status === 'taken') return <Chip tone="ok" icon="check">Tomado</Chip>
  if (dose.status === 'omitted') return <Chip tone="far" icon="x">No se dio · {MOTIVOS_CORTOS[dose.omission.motivo] ?? 'ELEAM'}</Chip>
  if (dose.status === 'missed') return <Chip tone="warn" icon="alert">No confirmado</Chip>
  if (dose.status === 'now') return <Chip tone="warn" icon="clock">{dose.when > now ? enCuanto(now, dose.when) : 'Pendiente'}</Chip>
  return <Chip tone="muted" icon="clock">Programado</Chip>
}

export function AttendanceChip({ status }) {
  if (status === 'done') return <Chip tone="ok" icon="check">Asistió</Chip>
  if (status === 'missed') return <Chip tone="warn" icon="x">No asistió</Chip>
  if (status === 'ask') return <Chip tone="warn" icon="clock">Sin respuesta</Chip>
  return <Chip tone="muted" icon="clock">Programada</Chip>
}

export default function FamilySummary() {
  const { state, now, elder, elderId } = useFamily()
  const today = toISODate(now)
  const doses = dosesForDay(state, elderId, today, now)
  const taken = doses.filter((d) => d.status === 'taken').length
  const acts = eventsOn(state, elderId, today).filter((a) => a.tipo === 'actividad')
  const appt = upcomingAppointments(state, elderId, now)[0]
  const low = lowStock(state, elderId)

  return (
    <FamilyShell title="Resumen">
      <section className="f-card" aria-labelledby="sum-meds">
        <div className="f-h2">
          <h2 id="sum-meds" style={{ fontSize: 17 }}>Remedios de hoy</h2>
          <span className="f-meta">{taken} de {doses.length} tomados</span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={doses.length} aria-valuenow={taken} aria-label="Remedios tomados">
          <div style={{ width: `${doses.length ? (taken / doses.length) * 100 : 0}%` }} />
        </div>
        {doses.length === 0 ? (
          <p className="f-help">{elder.nombre} no tiene remedios programados.</p>
        ) : (
          <ul className="f-list">
            {doses.map((d) => (
              <li key={d.key} className="f-row">
                <span className="f-row__time">{d.time}</span>
                <span className="f-row__main">
                  <span className="f-row__title" style={{ display: 'block' }}>{d.med.nombre}</span>
                  <span className="f-row__sub">{d.med.dosis}{d.takenAt ? ` · a las ${d.takenAt.toTimeString().slice(0, 5)}` : ''}</span>
                </span>
                <DoseChip dose={d} now={now} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {low.map((m) => (
        <div key={m.id} className="f-alert" role="note">
          <Icon name="alert" size={22} stroke={2.2} />
          <p><strong>Stock bajo:</strong> a {m.nombre} le {m.stockDias === 1 ? 'queda 1 día' : `quedan ${m.stockDias} días`}. Compra a cargo de {personName(state, m.responsableId)}.</p>
        </div>
      ))}

      <section className="f-card" aria-labelledby="sum-acts">
        <div className="f-h2"><h2 id="sum-acts" style={{ fontSize: 17 }}>Actividades de hoy</h2><Link to="/familiar/agenda">Ver agenda</Link></div>
        {acts.length === 0 ? (
          <p className="f-help" style={{ marginTop: 8 }}>Sin actividades para hoy.</p>
        ) : (
          <ul className="f-list">
            {acts.map((a) => (
              <li key={a.id} className="f-row">
                <span className="f-row__time">{a.hora}</span>
                <span className="f-row__main">
                  <span className="f-row__title" style={{ display: 'block' }}>{a.titulo}</span>
                  <span className="f-row__sub">{a.con || a.lugar}</span>
                </span>
                <AttendanceChip status={activityStatus(state, a, elderId, now)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {appt && (
        <Link to="/familiar/agenda" className="f-card f-tile">
          <span className="f-tile__icon theme-con" style={{ background: 'var(--sec-soft)', color: 'var(--sec)' }}>
            <Icon name="cross" size={24} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="f-meta" style={{ display: 'block' }}>Próxima consulta · {daysBetween(today, appt.fecha) === 0 ? 'hoy' : `en ${daysBetween(today, appt.fecha)} días`}</span>
            <strong style={{ display: 'block', fontSize: 16 }}>{appt.titulo} · {relativeDay(appt.fecha, today)}, {appt.hora}</strong>
            <span className="f-meta">{appt.con ? `${appt.con} · ` : ''}{appt.lugar}</span>
          </span>
          <Icon name="chevron" size={20} />
        </Link>
      )}

      <Link to="/familiar/actividad/nueva" className="btn btn--primary">
        <Icon name="plus" size={20} stroke={2.5} />
        Añadir actividad
      </Link>
    </FamilyShell>
  )
}

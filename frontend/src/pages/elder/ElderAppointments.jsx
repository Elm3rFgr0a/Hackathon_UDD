import { Falta } from '../../components/common'
import { daysBetween, monthName, toISODate } from '../../lib/dates'
import { upcomingAppointments } from '../../lib/selectors'
import { DateBlock, ElderPage, Empty, useElder } from './parts'

export default function ElderAppointments() {
  const { state, now, elderId } = useElder()
  const today = toISODate(now)
  const list = upcomingAppointments(state, elderId, now)

  return (
    <ElderPage theme="con" icon="cross" title="Mis consultas" subtitle={list.length ? `Tienes ${list.length} ${list.length === 1 ? 'próxima' : 'próximas'}` : undefined}>
      {list.length === 0 ? (
        <Empty title="No tienes consultas agendadas" />
      ) : (
        <ul className="e-list">
          {list.map((c) => (
            <li key={c.id} className="e-card">
              <div className="e-row">
                <DateBlock iso={c.fecha} />
                <div>
                  <div className="e-big-time">{c.hora}</div>
                  <div className="e-sub" style={{ marginTop: 4 }}>{monthName(c.fecha)}</div>
                </div>
              </div>
              <div>
                <div className="e-name">{c.titulo}</div>
                {c.con && <div className="e-sub" style={{ color: 'var(--ink)' }}>{c.con}</div>}
                <div className="e-sub">{c.lugar}</div>
              </div>
              <Falta days={daysBetween(today, c.fecha)} que="tu consulta" />
            </li>
          ))}
        </ul>
      )}
    </ElderPage>
  )
}

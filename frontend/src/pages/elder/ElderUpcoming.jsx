import { Falta } from '../../components/common'
import { daysBetween, toISODate } from '../../lib/dates'
import { upcomingEvents } from '../../lib/selectors'
import { DateBlock, ElderPage, Empty, useElder } from './parts'

export default function ElderUpcoming() {
  const { state, now, elderId } = useElder()
  const today = toISODate(now)
  const list = upcomingEvents(state, elderId, now, 14)

  return (
    <ElderPage theme="pro" icon="calendar" title="Lo que viene" subtitle="Próximas dos semanas">
      {list.length === 0 ? (
        <Empty title="Nada agendado por ahora" />
      ) : (
        <ul className="e-list">
          {list.map((a) => (
            <li key={a.id} className="e-card">
              <div className="e-row">
                <DateBlock iso={a.fecha} />
                <div className="e-row__main">
                  <div className="e-name">{a.titulo}</div>
                  <div className="e-sub">{a.tipo === 'consulta' ? 'Consulta médica · ' : ''}{a.hora}{a.lugar ? ` · ${a.lugar}` : ''}</div>
                </div>
              </div>
              <Falta days={daysBetween(today, a.fecha)} que={a.tipo === 'consulta' ? 'tu consulta' : 'la actividad'} />
            </li>
          ))}
        </ul>
      )}
    </ElderPage>
  )
}

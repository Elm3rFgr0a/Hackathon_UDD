import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Falta } from '../../components/common'
import { daysBetween, toISODate } from '../../lib/dates'
import { nearbyFor } from '../../lib/selectors'
import { DateBlock, ElderPage, Empty, useElder } from './parts'

export function Distance({ event }) {
  return event.walk ? (
    <div className="distance distance--walk">
      <Icon name="walk" size={34} stroke={2.4} />
      <span>A {event.minutosCaminando} minutos caminando</span>
    </div>
  ) : (
    <div className="distance distance--car">
      <Icon name="car" size={34} stroke={2.4} />
      <span>Lejos ({String(event.distanciaKm).replace('.', ',')} km): se recomienda usar vehículo</span>
    </div>
  )
}

export default function ElderNearby() {
  const { state, now, elderId, addNearbyToAgenda } = useElder()
  const navigate = useNavigate()
  const today = toISODate(now)
  const events = nearbyFor(state, elderId, now)

  const add = (ev) => {
    const id = addNearbyToAgenda(ev, elderId)
    navigate(`/adulto/cerca/listo/${ev.id}`, { state: { activityId: id } })
  }

  return (
    <ElderPage theme="cer" icon="pin" title="Cerca de mí" subtitle="Actividades del barrio y la municipalidad">
      {events.length === 0 ? (
        <Empty title="No hay actividades cerca por ahora">Te avisaremos cuando aparezca una nueva.</Empty>
      ) : (
        <ul className="e-list">
          {events.map((ev) => (
            <li key={ev.id} className="e-card">
              <div className="e-row">
                <DateBlock iso={ev.fecha} />
                <div className="e-row__main">
                  <div className="e-name">{ev.titulo}</div>
                  <div className="e-sub">{ev.hora} · {ev.lugar}</div>
                </div>
              </div>
              <Distance event={ev} />
              <Falta days={daysBetween(today, ev.fecha)} que="la actividad" />
              {ev.added ? (
                <p className="e-status e-status--ok" style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, fontSize: 24, minHeight: 56 }}>
                  <Icon name="check" size={32} stroke={3.5} />Ya está en tu agenda
                </p>
              ) : (
                <button type="button" className="e-btn e-btn--primary press" onClick={() => add(ev)}>
                  <Icon name="plus" size={32} stroke={3.5} />
                  Sumar a mi día
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </ElderPage>
  )
}

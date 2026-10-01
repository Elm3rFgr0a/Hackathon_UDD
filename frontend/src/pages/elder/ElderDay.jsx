import { Icon } from '../../components/Icon'
import { longDate, toISODate } from '../../lib/dates'
import { activityStatus, eventsOn } from '../../lib/selectors'
import { ElderPage, Empty, useElder } from './parts'

const ICONS = { walk: 'walk', video: 'video', cup: 'cup', sun: 'sun', cross: 'cross', pin: 'pin' }

function ActivityCard({ act, status, onAnswer }) {
  const head = (
    <>
      <div className="e-row">
        <span className="e-disc"><Icon name={ICONS[act.icono] || 'sun'} size={34} stroke={2.2} /></span>
        <span className="e-big-time">{act.hora}</span>
        <span className="e-spacer" />
        {status === 'done' && <span className="e-status e-status--ok"><Icon name="check" size={30} stroke={3.5} />Asistí</span>}
        {status === 'missed' && <span className="e-status e-status--no"><Icon name="x" size={28} stroke={3.5} />No asistí</span>}
        {status === 'later' && <span className="e-status e-status--no"><Icon name="clock" size={28} stroke={2.5} />Más tarde</span>}
      </div>
      <div>
        <div className="e-name">{act.titulo}</div>
        <div className="e-sub">{act.con || act.lugar}</div>
      </div>
    </>
  )

  if (status !== 'ask') {
    return <li className={`e-card${status === 'later' ? '' : ' e-card--quiet'}`}>{head}</li>
  }
  return (
    <li className="e-card e-card--focus">
      {head}
      <p className="e-question" id={`q-${act.id}`}>¿Cómo te fue?</p>
      <div className="e-btn-row" role="group" aria-labelledby={`q-${act.id}`}>
        <button type="button" className="e-btn e-btn--primary press" onClick={() => onAnswer('asistio')}>
          <Icon name="check" size={28} stroke={3.5} />Asistí
        </button>
        <button type="button" className="e-btn e-btn--outline press" onClick={() => onAnswer('no')}>
          <Icon name="x" size={26} stroke={3.5} />No asistí
        </button>
      </div>
    </li>
  )
}

export default function ElderDay() {
  const { state, now, elderId, setAttendance } = useElder()
  const today = toISODate(now)
  const acts = eventsOn(state, elderId, today)

  return (
    <ElderPage theme="dia" icon="sun" title="Mi día" subtitle={longDate(today)}>
      {acts.length === 0 ? (
        <Empty title="Hoy no tienes actividades">Mira «Cerca de mí» para encontrar algo entretenido.</Empty>
      ) : (
        <ul className="e-list">
          {acts.map((a) => (
            <ActivityCard key={a.id} act={a} status={activityStatus(state, a, elderId, now)}
              onAnswer={(v) => setAttendance(a.id, elderId, v)} />
          ))}
        </ul>
      )}
    </ElderPage>
  )
}

import { Icon } from '../../components/Icon'
import { enCuanto, toISODate } from '../../lib/dates'
import { dosesForDay } from '../../lib/selectors'
import { ElderPage, Empty, useElder } from './parts'

function DoseCard({ dose, now, onTake }) {
  const { med, time, status } = dose
  const detail = `${med.dosis} · ${med.cantidad}`

  if (status === 'now' || status === 'missed') {
    const missed = status === 'missed'
    return (
      <li className={missed ? 'e-card e-card--alert' : 'e-card e-card--focus'}>
        <div className="e-row">
          <span className={`e-time${missed ? ' e-time--accent' : ''}`}>{time}</span>
          <span className="e-note" style={missed ? undefined : { color: 'var(--sec)' }}>
            {missed ? 'Aún no lo marcas' : dose.when > now ? `Ahora (${enCuanto(now, dose.when)})` : 'Es ahora'}
          </span>
        </div>
        <div>
          <div className="e-name">{med.nombre}</div>
          <div className="e-sub">{detail}{med.indicacion ? `, ${med.indicacion.toLowerCase()}` : ''}</div>
        </div>
        <button type="button" className="e-btn e-btn--primary press" onClick={onTake}>
          <Icon name="check" size={34} stroke={3.5} />
          Ya lo tomé
        </button>
      </li>
    )
  }

  const taken = status === 'taken'
  return (
    <li className={`e-card${taken || status === 'omitted' ? ' e-card--quiet' : ''}`}>
      <div className="e-row">
        <span className="e-time">{time}</span>
        <span className="e-spacer" />
        {taken ? (
          <span className="e-status e-status--ok"><Icon name="check" size={30} stroke={3.5} />Tomado</span>
        ) : status === 'omitted' ? (
          <span className="e-status e-status--no"><Icon name="x" size={28} stroke={3.5} />No se dio</span>
        ) : (
          <span className="e-status e-status--no"><Icon name="clock" size={28} stroke={2.5} />Más tarde</span>
        )}
      </div>
      <div>
        <div className="e-name">{med.nombre}</div>
        <div className="e-sub">{detail}</div>
      </div>
    </li>
  )
}

export default function ElderMeds() {
  const { state, now, elderId, takeDose } = useElder()
  const today = toISODate(now)
  const doses = dosesForDay(state, elderId, today, now)
  const taken = doses.filter((d) => d.status === 'taken').length

  return (
    <ElderPage theme="rem" icon="pill" title="Mis remedios de hoy" subtitle={doses.length ? `${taken} de ${doses.length} tomados` : undefined}>
      {doses.length === 0 ? (
        <Empty title="No tienes remedios hoy">Tu familia puede agregarlos desde su app.</Empty>
      ) : (
        <ul className="e-list">
          {doses.map((d) => (
            <DoseCard key={d.key} dose={d} now={now} onTake={() => takeDose({ medId: d.med.id, iso: today, time: d.time })} />
          ))}
        </ul>
      )}
    </ElderPage>
  )
}

import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Avatar, Chip } from '../../components/common'
import { edad, toISODate } from '../../lib/dates'
import { daySummary, dosesForDay, lowStock } from '../../lib/selectors'
import { BellButton, useFamily } from './FamilyShell'

function status(state, elderId, now) {
  const doses = dosesForDay(state, elderId, toISODate(now), now)
  const pending = doses.filter((d) => d.status === 'missed' || d.status === 'now').length
  if (pending) return <Chip tone="warn" icon="clock">{pending} {pending === 1 ? 'remedio pendiente' : 'remedios pendientes'}</Chip>
  if (lowStock(state, elderId).length) return <Chip tone="warn" icon="box">Stock bajo</Chip>
  return <Chip tone="ok" icon="check">Todo al día</Chip>
}

export default function ElderPicker() {
  const { state, now, me, selectElder, logout } = useFamily()
  const navigate = useNavigate()

  const pick = (id) => {
    selectElder(id)
    navigate('/familiar/resumen')
  }

  return (
    <>
      <header className="f-bar" style={{ borderBottom: 0, background: 'transparent', position: 'static' }}>
        <div className="f-bar__title" />
        <BellButton />
        <button type="button" className="f-icon-btn" aria-label="Cerrar sesión" onClick={() => { logout(); navigate('/login', { replace: true }) }}>
          <Icon name="logout" />
        </button>
      </header>
      <div className="f-hello" style={{ paddingTop: 8 }}>
        <span>Hola, {me.nombre}</span>
        <h1>¿A quién quieres acompañar hoy?</h1>
      </div>
      <main className="f-main">
        <ul className="f-section" style={{ listStyle: 'none' }}>
          {state.elders.map((e) => {
            const sum = daySummary(state, e.id, toISODate(now), now)
            return (
              <li key={e.id}>
                <button type="button" className="f-person" onClick={() => pick(e.id)}>
                  <Avatar person={e} size={56} />
                  <span className="f-person__main">
                    <span className="f-person__name">{e.nombre} {e.apellido}</span>
                    <span className="f-meta">{edad(e.fechaNacimiento, now)} años · {e.residencia}</span>
                    <span className="f-meta">Hoy: {sum.dosesTaken} de {sum.dosesTotal} remedios</span>
                    <span>{status(state, e.id, now)}</span>
                  </span>
                  <span className="f-person__chevron"><Icon name="chevron" /></span>
                </button>
              </li>
            )
          })}
        </ul>
        <Link to="/familiar/personas/nueva" className="btn btn--secondary">
          <Icon name="plus" size={20} stroke={2.5} />
          Añadir adulto mayor
        </Link>
      </main>
    </>
  )
}

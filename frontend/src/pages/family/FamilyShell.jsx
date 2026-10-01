import { Link, NavLink } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Avatar } from '../../components/common'
import { useNotifications } from '../../components/notifications'
import { useApp } from '../../context/AppContext'
import { elderById, memberById } from '../../lib/selectors'

const TABS = [
  { to: '/familiar/resumen', icon: 'home', label: 'Resumen' },
  { to: '/familiar/agenda', icon: 'calendar', label: 'Agenda' },
  { to: '/familiar/remedios', icon: 'pill', label: 'Remedios' },
  { to: '/familiar/personas', icon: 'users', label: 'Personas' },
]

export function useFamily() {
  const app = useApp()
  const me = memberById(app.state, app.session.personId)
  const elder = elderById(app.state, app.session.selectedElderId)
  return { ...app, me, elder, elderId: elder?.id }
}

export function BellButton() {
  const { unread } = useNotifications()
  return (
    <Link to="/familiar/avisos" className="f-icon-btn" aria-label={`Avisos${unread.length ? `, ${unread.length} sin leer` : ''}`}>
      <Icon name="bell" />
      {unread.length > 0 && <span className="badge">{unread.length > 9 ? '9+' : unread.length}</span>}
    </Link>
  )
}

/**
 * Estructura de las pantallas del familiar. `withElder` muestra a quién se
 * está acompañando y el botón para cambiar.
 */
export default function FamilyShell({ title, withElder = true, back, actions, nav = true, children }) {
  const { elder } = useFamily()
  return (
    <>
      <header className="f-bar">
        {back && (
          <Link to={back} className="f-icon-btn" aria-label="Volver" style={{ marginLeft: -8 }}>
            <Icon name="back" />
          </Link>
        )}
        <div className="f-bar__title">
          {withElder && elder && <Avatar person={elder} size={36} />}
          <h1>
            {title}
            {withElder && elder && <small>{elder.nombre} {elder.apellido}</small>}
          </h1>
        </div>
        {withElder && elder && (
          <Link to="/familiar" className="f-switch" aria-label={`Cambiar persona, ahora ${elder.nombre}`}>
            <Icon name="swap" size={16} stroke={2.2} />
            Cambiar
          </Link>
        )}
        {actions}
        <BellButton />
      </header>
      <main className="f-main">{children}</main>
      {nav && (
        <nav className="f-nav" aria-label="Principal">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <Icon name={t.icon} size={24} stroke={2.2} />
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  )
}

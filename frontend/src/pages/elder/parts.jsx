import { Link } from 'react-router-dom'
import { FilledIcon, Icon } from '../../components/Icon'
import { useApp } from '../../context/AppContext'
import { elderById } from '../../lib/selectors'

export function useElder() {
  const app = useApp()
  const elder = elderById(app.state, app.session.personId)
  return { ...app, elder, elderId: elder?.id }
}

export function BackButton({ to = '/adulto', label = 'Volver' }) {
  return (
    <Link to={to} className="e-back press">
      <Icon name="back" size={30} stroke={3.5} />
      {label}
    </Link>
  )
}

/** Página con color de sección, botón Volver y título con ícono relleno. */
export function ElderPage({ theme, icon, title, subtitle, back = true, children }) {
  return (
    <main className={`e-page theme-${theme}`}>
      {back && <BackButton />}
      {title && (
        <header className="e-title">
          <span className="e-title__icon"><FilledIcon name={icon} size={42} /></span>
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </header>
      )}
      {children}
    </main>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="e-empty">
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  )
}

export function DateBlock({ iso }) {
  const d = new Date(`${iso}T12:00:00`)
  const wd = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()]
  return (
    <span className="e-date" aria-hidden="true">
      <span className="e-date__wd">{wd}</span>
      <span className="e-date__d">{d.getDate()}</span>
    </span>
  )
}

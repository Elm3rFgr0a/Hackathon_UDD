import { Link, useNavigate } from 'react-router-dom'
import { FilledIcon, Icon } from '../../components/Icon'
import { useNotifications } from '../../components/notifications'
import { enCuanto, longDate, saludo, toISODate } from '../../lib/dates'
import { dosesForDay, nearbyFor, nextDose } from '../../lib/selectors'
import { useElder } from './parts'

const TILES = [
  { to: '/adulto/remedios', theme: 'rem', icon: 'pill', label: 'Mis remedios' },
  { to: '/adulto/mi-dia', theme: 'dia', icon: 'sun', label: 'Mi día' },
  { to: '/adulto/consultas', theme: 'con', icon: 'cross', label: 'Mis consultas' },
  { to: '/adulto/proximos', theme: 'pro', icon: 'calendar', label: 'Próximos días' },
]

export default function ElderHome() {
  const { state, now, elder, elderId, takeDose, logout } = useElder()
  const navigate = useNavigate()
  const { unread } = useNotifications()
  const today = toISODate(now)
  const next = nextDose(state, elderId, now)
  const doses = dosesForDay(state, elderId, today, now)
  const pendingNearby = nearbyFor(state, elderId, now).filter((n) => !n.added).length

  const exit = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="e-page theme-rem">
      <header className="e-home-head">
        <div>
          <p>{longDate(today)}</p>
          <h1>{saludo(now)}, {elder.nombre}</h1>
        </div>
        <Link to="/adulto/avisos" className="e-bell" aria-label={`Mis avisos${unread.length ? `, ${unread.length} sin leer` : ''}`}>
          <FilledIcon name="bell" size={32} />
          {unread.length > 0 && <span className="badge">{unread.length}</span>}
        </Link>
      </header>

      {next ? (
        <section className="e-hero" aria-label="Próximo remedio">
          <span className="e-hero__label"><FilledIcon name="pill" size={36} />Próximo remedio</span>
          <div className="e-hero__when">
            <span className="e-hero__time">{next.time}</span>
            <span className="e-hero__rel">{next.when > now ? enCuanto(now, next.when) : 'es ahora'}</span>
          </div>
          <div>
            <div className="e-hero__med">{next.med.nombre} {next.med.dosis}</div>
            <div className="e-hero__dose">{next.med.cantidad}{next.med.indicacion ? `, ${next.med.indicacion.toLowerCase()}` : ''}</div>
          </div>
          <button type="button" className="e-btn e-btn--light press" onClick={() => takeDose({ medId: next.med.id, iso: today, time: next.time })}>
            <Icon name="check" size={34} stroke={3.5} />
            Ya lo tomé
          </button>
        </section>
      ) : (
        <section className="e-hero e-hero--done" aria-label="Remedios de hoy">
          <Icon name="check" size={56} stroke={3.5} />
          <div>
            <strong>{doses.length ? 'Listo por hoy' : 'Sin remedios hoy'}</strong>
            <span>{doses.length ? 'No te quedan remedios por tomar.' : 'No tienes remedios programados.'}</span>
          </div>
        </section>
      )}

      <nav className="e-tiles" aria-label="Secciones">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className={`e-tile press theme-${t.theme}`}>
            <FilledIcon name={t.icon} size={64} />
            {t.label}
          </Link>
        ))}
        <Link to="/adulto/cerca" className="e-tile e-tile--wide press theme-cer">
          <FilledIcon name="pin" size={64} />
          <span className="e-tile__text">
            Cerca de mí
            <span className="e-tile__sub">
              {pendingNearby ? `${pendingNearby} ${pendingNearby === 1 ? 'actividad nueva' : 'actividades nuevas'}` : 'Actividades del barrio'}
            </span>
          </span>
          <Icon name="chevron" size={32} stroke={3.5} />
        </Link>
      </nav>

      <button type="button" className="e-logout" onClick={exit}>
        <Icon name="logout" size={22} />
        Cerrar sesión
      </button>
    </main>
  )
}

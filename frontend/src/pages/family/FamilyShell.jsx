import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
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

// Última pestaña mostrada, para saber desde qué lado entra la siguiente.
let lastTab = null
export const resetTabTransition = () => {
  lastTab = null
}

const SWIPE_MIN = 70 // px para cambiar de pestaña al soltar

/**
 * Deslizar horizontalmente entre pestañas: el contenido sigue al dedo y, al
 * soltar pasado el umbral, cambia a la pestaña vecina. La pantalla nueva
 * entra desde el lado correspondiente (también al tocar una pestaña).
 */
function useTabSwipe() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const index = TABS.findIndex((t) => t.to === pathname)
  const ref = useRef(null)
  const drag = useRef(null)

  const [enterFrom] = useState(() =>
    index < 0 || lastTab === null || lastTab === index ? null : index > lastTab ? 'right' : 'left',
  )
  useEffect(() => {
    lastTab = index >= 0 ? index : null
  }, [index])

  if (index < 0) return { ref, enterFrom: null, handlers: {} }

  const move = (x, animate) => {
    const el = ref.current
    if (!el) return
    el.style.transition = animate ? 'transform 0.2s ease-out, opacity 0.2s ease-out' : 'none'
    el.style.transform = x ? `translateX(${x}px)` : ''
    el.style.opacity = x ? String(1 - Math.min(Math.abs(x) / 900, 0.25)) : ''
  }

  const handlers = {
    onTouchStart: (e) => {
      if (e.touches.length !== 1 || e.target.closest('input, select, textarea, [role="dialog"]')) return
      const t = e.touches[0]
      drag.current = { x: t.clientX, y: t.clientY, dx: 0, axis: null }
    },
    onTouchMove: (e) => {
      const d = drag.current
      if (!d) return
      const t = e.touches[0]
      const dx = t.clientX - d.x
      const dy = t.clientY - d.y
      if (!d.axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) d.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y'
      if (d.axis !== 'x') return
      const hasNeighbor = dx < 0 ? index < TABS.length - 1 : index > 0
      d.dx = dx
      move(hasNeighbor ? dx * 0.85 : dx * 0.2) // resistencia en los extremos
    },
    onTouchEnd: () => {
      const d = drag.current
      drag.current = null
      if (!d || d.axis !== 'x') return
      const target = d.dx <= -SWIPE_MIN ? index + 1 : d.dx >= SWIPE_MIN ? index - 1 : -1
      if (target >= 0 && target < TABS.length) navigate(TABS[target].to)
      else move(0, true)
    },
  }
  handlers.onTouchCancel = handlers.onTouchEnd

  return { ref, enterFrom, handlers }
}

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
  const swipe = useTabSwipe()
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
      <main
        ref={swipe.ref}
        className={`f-main${swipe.enterFrom ? ` f-main--from-${swipe.enterFrom}` : ''}`}
        {...swipe.handlers}
      >
        {children}
      </main>
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

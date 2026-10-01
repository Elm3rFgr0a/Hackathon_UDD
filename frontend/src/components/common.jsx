import { useEffect, useRef } from 'react'
import { Icon } from './Icon'
import { faltanTexto } from '../lib/dates'
import { initials } from '../lib/selectors'

export function Avatar({ person, size = 48 }) {
  return (
    <span
      className={`avatar avatar--${person?.color || 'gray'}`}
      style={{ width: size, height: size, fontSize: Math.round(size / 2.6) }}
      aria-hidden="true"
    >
      {initials(person)}
    </span>
  )
}

/** Etiqueta "Faltan n días para…" del adulto mayor. */
export function Falta({ days, que }) {
  return (
    <span className={`falta${days <= 0 ? ' falta--today' : ''}`}>
      <Icon name="clock" size={20} stroke={2.5} />
      {faltanTexto(days, que)}
    </span>
  )
}

export function Chip({ tone = 'muted', icon, children }) {
  return (
    <span className={`chip chip--${tone}`}>
      {icon && <Icon name={icon} size={14} stroke={2.5} />}
      {children}
    </span>
  )
}

/** Hoja modal inferior, con foco inicial y cierre con Escape. */
export function Sheet({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    ;(ref.current?.querySelector('input, select, textarea') || ref.current?.querySelector('button'))?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <span className="sheet__grip" />
        <div className="sheet__head">
          <h2>{title}</h2>
          <button type="button" className="f-icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

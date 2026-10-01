import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Chip } from '../../components/common'
import { medsOf, personName } from '../../lib/selectors'
import FamilyShell, { useFamily } from './FamilyShell'

export default function FamilyMeds() {
  const { state, me, elder, elderId } = useFamily()
  const meds = medsOf(state, elderId).sort((a, b) => (a.horarios[0] || '').localeCompare(b.horarios[0] || ''))
  const canEdit = me.permiso !== 've'

  return (
    <FamilyShell title="Remedios">
      {meds.length === 0 && <p className="f-empty">{elder.nombre} todavía no tiene remedios registrados.</p>}
      <ul className="f-section" style={{ listStyle: 'none' }}>
        {meds.map((m) => (
          <li key={m.id} className="f-card">
            <div className="f-tile" style={{ alignItems: 'flex-start' }}>
              <span className="f-tile__icon"><Icon name="pill" /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{m.nombre} {m.dosis}</div>
                <div className="f-meta">{m.cantidad} · {m.horarios.join(', ')}{m.indicacion ? ` · ${m.indicacion}` : ''}</div>
              </div>
              {canEdit && (
                <Link to={`/familiar/remedios/${m.id}`} className="f-icon-btn" aria-label={`Editar ${m.nombre}`} style={{ color: 'var(--pri)', marginTop: -8, marginRight: -8 }}>
                  <Icon name="edit" size={20} stroke={2.2} />
                </Link>
              )}
            </div>
            <div className="chips" style={{ marginTop: 12 }}>
              <Chip tone={m.stockDias <= 7 ? 'warn' : 'muted'} icon="box">
                {m.stockDias === 1 ? 'Queda 1 día' : `Quedan ${m.stockDias} días`}
              </Chip>
              <Chip tone="muted" icon="user">Compra: {personName(state, m.responsableId)}</Chip>
            </div>
          </li>
        ))}
      </ul>
      {canEdit && (
        <Link to="/familiar/remedios/nuevo" className="btn btn--primary">
          <Icon name="plus" size={20} stroke={2.5} />
          Añadir remedio
        </Link>
      )}
      <p className="f-help">
        {elder.nombre} recibe una alarma a la hora de cada remedio y la confirma desde su teléfono. Si no la confirma en 30 minutos, te avisamos.
      </p>
    </FamilyShell>
  )
}

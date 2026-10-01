import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Chip, Sheet } from '../../components/common'
import { medsOf, personName } from '../../lib/selectors'
import FamilyShell, { useFamily } from './FamilyShell'

const CAJA_ESTANDAR = 30

/** Semáforo del stock: el del servidor si viene; si no (modo local), calculado. */
const semaforoDe = (m) => m.semaforo ?? (m.stockDias <= 3 ? 'rojo' : m.stockDias <= 7 ? 'amarillo' : 'verde')
const TONO = { rojo: 'far', amarillo: 'warn', verde: 'muted' }

function PurchaseSheet({ med, onClose, onConfirm }) {
  const [unidades, setUnidades] = useState(String(CAJA_ESTANDAR))
  const [error, setError] = useState('')
  const n = Number(unidades)
  const consumo = (med.unidadesPorToma ?? 1) * med.horarios.length
  const dias = consumo && Number.isInteger(n) && n > 0 ? Math.floor(n / consumo) : 0

  const submit = (e) => {
    e.preventDefault()
    if (!Number.isInteger(n) || n < 1 || n > 1000) return setError('Escribe un número entre 1 y 1000.')
    onConfirm(n)
    onClose()
  }

  return (
    <Sheet title={`Ya compré ${med.nombre}`} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="p-unidades">Unidades compradas</label>
          <input id="p-unidades" className="input" type="number" inputMode="numeric" min="1" max="1000"
            value={unidades} onChange={(e) => { setUnidades(e.target.value); setError('') }} aria-invalid={!!error} />
          {error && <span className="field__error" role="alert">{error}</span>}
        </div>
        <p className="f-help">
          Una caja estándar trae {CAJA_ESTANDAR}. {dias > 0 && `Alcanza para ${dias} ${dias === 1 ? 'día' : 'días'} más.`}
        </p>
        <button type="submit" className="btn btn--primary"><Icon name="check" size={20} stroke={2.5} />Sumar al stock</button>
      </form>
    </Sheet>
  )
}

export default function FamilyMeds() {
  const { state, me, elder, elderId, registerPurchase } = useFamily()
  const [buying, setBuying] = useState(null)
  const meds = medsOf(state, elderId).sort((a, b) => (a.horarios[0] || '').localeCompare(b.horarios[0] || ''))
  const canEdit = me.permiso !== 've'

  return (
    <FamilyShell title="Remedios">
      {meds.length === 0 && <p className="f-empty">{elder.nombre} todavía no tiene remedios registrados.</p>}
      <ul className="f-section" style={{ listStyle: 'none' }}>
        {meds.map((m) => {
          const sem = semaforoDe(m)
          return (
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
                <Chip tone={TONO[sem]} icon={sem === 'rojo' ? 'alert' : 'box'}>
                  {m.stockDias === 1 ? 'Queda 1 día' : `Quedan ${m.stockDias} días`}
                </Chip>
                <Chip tone="muted" icon="user">Compra: {personName(state, m.responsableId)}</Chip>
              </div>
              {canEdit && (
                <button type="button" className="btn btn--secondary btn--sm" style={{ marginTop: 12 }} onClick={() => setBuying(m)}>
                  <Icon name="box" size={18} />Ya compré
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {canEdit && (
        <Link to="/familiar/remedios/nuevo" className="btn btn--primary">
          <Icon name="plus" size={20} stroke={2.5} />
          Añadir remedio
        </Link>
      )}
      <p className="f-help">
        {elder.nombre} recibe una alarma a la hora de cada remedio y la confirma desde su teléfono; cada toma descuenta el stock.
        Si queda poco, avisamos por WhatsApp a quien compra.
      </p>
      {buying && <PurchaseSheet med={buying} onClose={() => setBuying(null)} onConfirm={(n) => registerPurchase(buying.id, n)} />}
    </FamilyShell>
  )
}

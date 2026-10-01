import { useEffect, useState } from 'react'
import { NotificationCard, useNotifications } from '../../components/notifications'
import { useApp } from '../../context/AppContext'
import FamilyShell from './FamilyShell'

function PushPermission() {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [perm, setPerm] = useState(supported ? Notification.permission : 'unsupported')
  if (!supported || perm === 'granted') return null
  return (
    <div className="f-card f-tile">
      <div style={{ flex: 1, fontSize: 15 }}>
        <strong>Recibe los avisos en tu teléfono</strong>
        <div className="f-meta">{perm === 'denied' ? 'Los bloqueaste en el navegador. Actívalos desde su configuración.' : 'Aunque no tengas la app abierta.'}</div>
      </div>
      {perm !== 'denied' && (
        <button type="button" className="btn btn--primary btn--sm" onClick={() => Notification.requestPermission().then(setPerm)}>Activar</button>
      )}
    </div>
  )
}

export default function FamilyNotifications() {
  const { now } = useApp()
  const { due, scheduled, isSeen, run, markSeen } = useNotifications()
  const [tab, setTab] = useState('recibidas')
  const list = tab === 'recibidas' ? due : scheduled

  useEffect(() => () => markSeen(due.map((n) => n.id)), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FamilyShell title="Avisos" withElder={false} back="/familiar/resumen">
      <PushPermission />
      <div className="tabs" role="tablist" aria-label="Avisos">
        <button type="button" role="tab" aria-selected={tab === 'recibidas'} onClick={() => setTab('recibidas')}>Recibidos ({due.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'programadas'} onClick={() => setTab('programadas')}>Programados ({scheduled.length})</button>
      </div>
      {tab === 'programadas' && <p className="f-help">Lo que la app enviará en las próximas 48 horas, a ti y a cada adulto mayor.</p>}
      {list.length === 0 ? (
        <p className="f-empty">{tab === 'recibidas' ? 'No tienes avisos.' : 'No hay avisos programados.'}</p>
      ) : (
        <ul className="f-section" style={{ listStyle: 'none' }} role="tabpanel">
          {list.map((n) => (
            <li key={n.id}>
              <NotificationCard n={n} now={now} showElder unread={tab === 'recibidas' && !isSeen(n) && !n.resolved}
                onAction={run} interactive={tab === 'recibidas'} />
            </li>
          ))}
        </ul>
      )}
    </FamilyShell>
  )
}

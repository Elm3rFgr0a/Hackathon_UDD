import { useEffect } from 'react'
import { HOUR } from '../../lib/dates'
import { NotificationCard, useNotifications } from '../../components/notifications'
import { ElderPage, Empty, useElder } from './parts'

export default function ElderNotifications() {
  const { now } = useElder()
  const { due, isSeen, run, markSeen } = useNotifications()
  const list = due.filter((n) => now - n.at < 24 * HOUR).slice(0, 10)

  // Al salir de la pantalla, todo lo mostrado queda como leído.
  useEffect(() => () => markSeen(list.map((n) => n.id)), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ElderPage theme="rem" icon="bell" title="Mis avisos" subtitle="Lo último que te enviamos">
      {list.length === 0 ? (
        <Empty title="No tienes avisos" />
      ) : (
        <ul className="e-list">
          {list.map((n) => (
            <li key={n.id}>
              <NotificationCard n={n} big unread={!isSeen(n) && !n.resolved} onAction={run} now={now} showTiming={false} />
            </li>
          ))}
        </ul>
      )}
    </ElderPage>
  )
}

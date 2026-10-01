import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Chip } from '../../components/common'
import { dayNumber, longDate, monthYear, relativeDay, toISODate, weekdayShort } from '../../lib/dates'
import { activityStatus, dosesForDay, eventsOn, personName, upcomingEvents, weekAround } from '../../lib/selectors'
import FamilyShell, { useFamily } from './FamilyShell'
import { AttendanceChip, DoseChip } from './FamilySummary'

const ICONS = { walk: 'walk', video: 'video', cup: 'cup', sun: 'sun', cross: 'cross', pin: 'pin' }

export default function FamilyAgenda() {
  const { state, now, me, elderId, removeActivity } = useFamily()
  const today = toISODate(now)
  const [day, setDay] = useState(today)
  const canEdit = me.permiso !== 've'

  const items = [
    ...dosesForDay(state, elderId, day, now).map((d) => ({ kind: 'dose', key: d.key, time: d.time, d })),
    ...eventsOn(state, elderId, day).map((a) => ({ kind: 'event', key: a.id, time: a.hora, a })),
  ].sort((x, y) => x.time.localeCompare(y.time))
  const upcoming = upcomingEvents(state, elderId, now, 14)

  const remove = (a) => {
    const others = a.elderIds.length > 1 ? ' (se quitará para todas las personas)' : ''
    if (window.confirm(`¿Eliminar «${a.titulo}»${others}?`)) removeActivity(a.id)
  }

  const eventRow = (a, showDate) => (
    <li key={a.id} className="tl__item">
      {showDate ? (
        <span className="tl__time tl__time--date"><small>{weekdayShort(a.fecha)}</small>{dayNumber(a.fecha)}</span>
      ) : (
        <span className="tl__time">{a.hora}</span>
      )}
      <div className="tl__card">
        <span className={`tl__icon${a.tipo === 'consulta' ? ' theme-con' : ''}`} style={a.tipo === 'consulta' ? { color: 'var(--sec)' } : undefined}>
          <Icon name={ICONS[a.icono] || 'sun'} size={22} />
        </span>
        <div className="tl__main">
          <div className="tl__title">{a.titulo}{showDate ? ` · ${a.hora}` : ''}</div>
          <div className="tl__sub">
            {a.elderIds.length > 1 ? 'Todo el núcleo familiar' : a.con || a.lugar}
            {a.creadoPor ? ` · por ${personName(state, a.creadoPor)}` : ''}
          </div>
          {!showDate && a.tipo === 'actividad' && (
            <div className="tl__chip"><AttendanceChip status={activityStatus(state, a, elderId, now)} /></div>
          )}
        </div>
        {canEdit && (
          <button type="button" className="tl__del" aria-label={`Eliminar ${a.titulo}`} onClick={() => remove(a)}>
            <Icon name="trash" size={18} />
          </button>
        )}
      </div>
    </li>
  )

  return (
    <FamilyShell
      title="Agenda"
      actions={canEdit && (
        <Link to={`/familiar/actividad/nueva?fecha=${day}`} className="f-icon-btn f-icon-btn--solid" aria-label="Añadir actividad">
          <Icon name="plus" stroke={2.5} />
        </Link>
      )}
    >
      <div className="f-h2"><h2 style={{ fontSize: 18 }}>{monthYear(day)}</h2></div>
      <div className="week" role="group" aria-label="Elegir día">
        {weekAround(now).map((iso) => (
          <button key={iso} type="button" aria-pressed={iso === day} onClick={() => setDay(iso)} aria-label={longDate(iso)}>
            <span className="week__wd">{weekdayShort(iso)}</span>
            <span className="week__d">{dayNumber(iso)}</span>
            {iso === today && <span className="week__today" />}
          </button>
        ))}
      </div>

      <section className="f-section" aria-label={longDate(day)}>
        <h2 className="f-h2">{relativeDay(day, today) === 'Hoy' ? `Hoy, ${longDate(day).toLowerCase()}` : longDate(day)}</h2>
        {items.length === 0 ? (
          <p className="f-empty">Nada programado este día.</p>
        ) : (
          <ul className="tl">
            {items.map((it) =>
              it.kind === 'dose' ? (
                <li key={it.key} className="tl__item">
                  <span className="tl__time">{it.time}</span>
                  <div className="tl__card">
                    <span className="tl__icon"><Icon name="pill" size={22} /></span>
                    <div className="tl__main">
                      <div className="tl__title">{it.d.med.nombre} {it.d.med.dosis}</div>
                      <div className="tl__sub">Remedio · {it.d.med.cantidad}</div>
                      <div className="tl__chip">{day <= today ? <DoseChip dose={it.d} now={now} /> : <Chip tone="muted">Programado</Chip>}</div>
                    </div>
                  </div>
                </li>
              ) : (
                eventRow(it.a, false)
              ),
            )}
          </ul>
        )}
      </section>

      <section className="f-section" aria-labelledby="ag-next">
        <h2 id="ag-next" className="f-h2">Próximamente</h2>
        {upcoming.length === 0 ? <p className="f-empty">Sin actividades en las próximas dos semanas.</p> : <ul className="tl">{upcoming.map((a) => eventRow(a, true))}</ul>}
      </section>
    </FamilyShell>
  )
}

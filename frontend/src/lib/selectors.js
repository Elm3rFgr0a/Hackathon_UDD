import { addDays, at, daysBetween, toISODate, MINUTE } from './dates'

export const elderById = (s, id) => s.elders.find((e) => e.id === id)
export const memberById = (s, id) => s.members.find((m) => m.id === id)
export const fullName = (p) => (p ? `${p.nombre} ${p.apellido}` : '')
export const initials = (p) => (p ? `${p.nombre[0]}${p.apellido[0]}`.toUpperCase() : '')

/** Nombre corto de quien creó algo (familiar o adulto mayor). */
export const personName = (s, id) => (memberById(s, id) || elderById(s, id))?.nombre ?? 'Alguien'

export const medsOf = (s, elderId) => s.medications.filter((m) => m.elderId === elderId)

export const doseKey = (medId, iso, time) => `${medId}|${iso}|${time}`

/**
 * Estado de cada toma del día:
 *  taken   → confirmada
 *  now     → desde 30 min antes hasta 60 min después de la hora
 *  missed  → pasó más de 1 hora sin confirmar
 *  later   → todavía falta
 */
export function dosesForDay(s, elderId, iso, now) {
  const list = []
  for (const med of medsOf(s, elderId)) {
    for (const time of med.horarios) {
      const key = doseKey(med.id, iso, time)
      const when = at(iso, time)
      const log = s.intakes[key]
      let status
      if (log) status = 'taken'
      else {
        const diff = (now - when) / MINUTE
        if (diff < -30) status = 'later'
        else if (diff <= 60) status = 'now'
        else status = 'missed'
      }
      list.push({ key, med, iso, time, when, status, takenAt: log ? new Date(log.at) : null })
    }
  }
  return list.sort((a, b) => a.when - b.when)
}

/** La toma que se muestra en grande en el inicio del adulto mayor. */
export function nextDose(s, elderId, now) {
  const doses = dosesForDay(s, elderId, toISODate(now), now)
  return doses.find((d) => d.status === 'now') || doses.find((d) => d.status === 'later') || null
}

export const eventsOf = (s, elderId) => s.activities.filter((a) => a.elderIds.includes(elderId))

const byDateTime = (a, b) => at(a.fecha, a.hora) - at(b.fecha, b.hora)

export const eventsOn = (s, elderId, iso) =>
  eventsOf(s, elderId).filter((a) => a.fecha === iso).sort(byDateTime)

/** Eventos desde mañana hasta `days` días más. */
export function upcomingEvents(s, elderId, now, days = 14) {
  const today = toISODate(now)
  return eventsOf(s, elderId)
    .filter((a) => {
      const n = daysBetween(today, a.fecha)
      return n >= 1 && n <= days
    })
    .sort(byDateTime)
}

export function upcomingAppointments(s, elderId, now) {
  return eventsOf(s, elderId)
    .filter((a) => a.tipo === 'consulta' && at(a.fecha, a.hora) >= new Date(now.getTime() - 60 * MINUTE))
    .sort(byDateTime)
}

export const attendanceOf = (s, actId, elderId) => s.attendance[`${actId}|${elderId}`] || null

/**
 * Estado de una actividad para el adulto mayor:
 *  done/missed → ya respondió asistí / no asistí
 *  ask         → ya empezó y falta responder
 *  later       → todavía no empieza
 */
export function activityStatus(s, act, elderId, now) {
  const att = attendanceOf(s, act.id, elderId)
  if (att) return att.value === 'asistio' ? 'done' : 'missed'
  if (act.tipo === 'actividad' && now >= at(act.fecha, act.hora)) return 'ask'
  return 'later'
}

export const nearbyActivityId = (eventId, elderId) => `cerca-${eventId}-${elderId}`

export function nearbyFor(s, elderId, now) {
  const today = toISODate(now)
  return s.nearby
    .filter((n) => daysBetween(today, n.fecha) >= 0)
    .sort(byDateTime)
    .map((n) => ({
      ...n,
      added: s.activities.some((a) => a.id === nearbyActivityId(n.id, elderId)),
      walk: n.minutosCaminando <= 20,
    }))
}

export function daySummary(s, elderId, iso, now) {
  const doses = dosesForDay(s, elderId, iso, now)
  const acts = eventsOn(s, elderId, iso).filter((a) => a.tipo === 'actividad')
  return {
    dosesTaken: doses.filter((d) => d.status === 'taken').length,
    dosesTotal: doses.length,
    attended: acts.filter((a) => attendanceOf(s, a.id, elderId)?.value === 'asistio').length,
    activities: acts.length,
  }
}

export const lowStock = (s, elderId) => medsOf(s, elderId).filter((m) => m.stockDias <= 7)

export const weekAround = (now) => Array.from({ length: 7 }, (_, i) => toISODate(addDays(now, i - 1)))

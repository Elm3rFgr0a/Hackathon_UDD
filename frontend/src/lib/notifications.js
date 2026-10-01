import { addDays, at, relativeDay, toISODate, HOUR, MINUTE } from './dates'
import {
  attendanceOf,
  daySummary,
  dosesForDay,
  elderById,
  eventsOf,
  medsOf,
  nearbyActivityId,
  personName,
} from './selectors'

/**
 * Motor de notificaciones. A partir del estado calcula cada aviso que la app
 * envía, con su hora de disparo. La UI filtra los ya disparados (`due`) y los
 * próximos (`scheduled`). En producción esta misma tabla de reglas vive en una
 * Lambda programada (EventBridge) que envía push; aquí se evalúa en el cliente.
 *
 * Cada aviso: { id, at, audience, elderId, section, timing, title, body,
 *               actions, resolved, link }
 */

const nombres = (lista) =>
  lista.length <= 1 ? lista.join('') : `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`

/** El WhatsApp empieza con el nombre de la app ("Autia: "); en la app se quita y se pone mayúscula. */
const sinPrefijo = (texto) => {
  const t = texto.replace(/^(Autia|Cerca): /, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Cómo salió el envío por WhatsApp de una alerta del servidor. */
function envioTexto(a) {
  const para = nombres(a.destinatarios ?? [])
  if (a.estado === 'enviada') return `Enviado por WhatsApp a ${para}.`
  if (a.estado === 'simulada') return `WhatsApp simulado para ${para}.`
  if (a.estado === 'parcial') return `Enviado por WhatsApp solo a algunos de: ${para}.`
  if (a.estado === 'fallida') return 'No se pudo enviar por WhatsApp.'
  return 'Nadie del núcleo tiene teléfono para WhatsApp.'
}

const plusMin = (d, m) => new Date(d.getTime() + m * MINUTE)

function forElder(s, elderId, now) {
  const out = []
  const elder = elderById(s, elderId)
  const name = elder.nombre
  const days = [-1, 0, 1].map((n) => toISODate(addDays(now, n)))

  // Remedios
  for (const iso of days) {
    for (const d of dosesForDay(s, elderId, iso, now)) {
      const m = d.med
      const taken = d.status === 'taken'
      // Una dosis que el ELEAM registró como no dada ya está resuelta: el servidor avisó a la familia.
      const omitted = d.status === 'omitted'
      const closed = taken || omitted
      const closedLabel = omitted ? 'No se dio' : 'Tomado'
      const takePayload = { medId: m.id, iso, time: d.time }
      out.push({
        id: `med-time|${d.key}`, at: d.when, audience: 'adulto', elderId, section: 'rem',
        timing: 'A la hora del remedio',
        title: 'Es hora de tu remedio',
        body: `${m.nombre} ${m.dosis} · ${m.cantidad}${m.indicacion ? `, ${m.indicacion.toLowerCase()}` : ''}.`,
        actions: [{ label: 'Ya lo tomé', type: 'take', payload: takePayload, primary: true }],
        resolved: closed, resolvedLabel: closedLabel, link: '/adulto/remedios',
      })
      const remindAt = plusMin(d.when, 15)
      if (!closed || (taken && d.takenAt > remindAt)) {
        out.push({
          id: `med-remind|${d.key}`, at: remindAt, audience: 'adulto', elderId, section: 'rem',
          timing: '15 min después, si no lo confirmó',
          title: `¿Ya tomaste tu ${m.nombre}?`,
          body: `Estaba programado para las ${d.time}.`,
          actions: [
            { label: 'Sí, lo tomé', type: 'take', payload: takePayload, primary: true },
            { label: 'Aún no', type: 'dismiss' },
          ],
          resolved: closed, resolvedLabel: closedLabel, link: '/adulto/remedios',
        })
      }
      const warnAt = plusMin(d.when, 30)
      if (!closed || (taken && d.takenAt > warnAt)) {
        out.push({
          id: `med-missed|${d.key}`, at: warnAt, audience: 'familiar', elderId, section: 'rem',
          timing: '30 min después, si no lo confirmó',
          title: `${name} aún no confirma su ${m.nombre}`,
          body: `Estaba programado a las ${d.time}.`,
          actions: [
            { label: `Llamar a ${name}`, type: 'call', payload: elder.telefono, primary: true },
            { label: 'Ver remedios', type: 'link', payload: '/familiar/remedios' },
          ],
          resolved: taken, resolvedLabel: 'Ya lo tomó', link: '/familiar/remedios',
        })
      }
    }
  }

  // Actividades y consultas
  for (const a of eventsOf(s, elderId)) {
    const start = at(a.fecha, a.hora)
    if (a.tipo === 'actividad') {
      const att = attendanceOf(s, a.id, elderId)
      out.push({
        id: `act-before|${a.id}|${elderId}`, at: plusMin(start, -60), audience: 'adulto', elderId, section: 'dia',
        timing: '1 hora antes de una actividad',
        title: `En 1 hora: ${a.titulo}`,
        body: `A las ${a.hora}${a.con ? ` · ${a.con}` : ''}${a.lugar ? ` · ${a.lugar}` : ''}.`,
        actions: [{ label: 'Ver mi día', type: 'link', payload: '/adulto/mi-dia', primary: true }],
        link: '/adulto/mi-dia',
      })
      out.push({
        id: `act-after|${a.id}|${elderId}`, at: plusMin(start, 60), audience: 'adulto', elderId, section: 'dia',
        timing: '1 hora después de una actividad',
        title: `¿Cómo va tu actividad ${a.titulo}?`,
        body: 'Cuéntanos si pudiste ir.',
        actions: [
          { label: 'Asistí', type: 'attend', payload: { actId: a.id, value: 'asistio' }, primary: true },
          { label: 'No asistí', type: 'attend', payload: { actId: a.id, value: 'no' } },
        ],
        resolved: !!att, resolvedLabel: att?.value === 'asistio' ? 'Asististe' : 'No asististe',
        link: '/adulto/mi-dia',
      })
      if (att) {
        const yes = att.value === 'asistio'
        out.push({
          id: `att|${a.id}|${elderId}|${att.value}`, at: new Date(att.at), audience: 'familiar', elderId,
          section: yes ? 'rem' : 'acc',
          timing: yes ? `Cuando ${name} marca «asistí»` : `Cuando ${name} marca «no asistí»`,
          title: yes ? `${name} asistió a ${a.titulo}` : `${name} no asistió a ${a.titulo}`,
          body: `Lo marcó a las ${new Date(att.at).toTimeString().slice(0, 5)}.`,
          actions: yes ? [] : [{ label: `Llamar a ${name}`, type: 'call', payload: elder.telefono, primary: true }],
          link: '/familiar/agenda',
        })
      } else {
        out.push({
          id: `att-none|${a.id}|${elderId}`, at: plusMin(start, 120), audience: 'familiar', elderId, section: 'acc',
          timing: `1 h después del aviso, si ${name} no responde`,
          title: `${name} no ha respondido sobre su actividad`,
          body: `${a.titulo}, ${a.hora}.`,
          actions: [
            { label: `Llamar a ${name}`, type: 'call', payload: elder.telefono, primary: true },
            { label: 'Ver agenda', type: 'link', payload: '/familiar/agenda' },
          ],
          link: '/familiar/agenda',
        })
      }
    } else {
      const eve = at(toISODate(addDays(start, -1)), '18:00')
      out.push({
        id: `appt-eve|${a.id}|${elderId}`, at: eve, audience: 'adulto', elderId, section: 'con',
        timing: '1 día antes de una consulta',
        title: 'Mañana tienes consulta',
        body: `${a.titulo} · ${a.hora} · ${a.lugar}.`,
        actions: [{ label: 'Ver consulta', type: 'link', payload: '/adulto/consultas', primary: true }],
        link: '/adulto/consultas',
      })
      out.push({
        id: `appt-before|${a.id}|${elderId}`, at: plusMin(start, -60), audience: 'adulto', elderId, section: 'con',
        timing: '1 hora antes de una consulta',
        title: `En 1 hora: ${a.titulo}`,
        body: `${a.lugar}${a.con ? `. ${a.con}` : ''}.`,
        actions: [{ label: 'Ver consulta', type: 'link', payload: '/adulto/consultas', primary: true }],
        link: '/adulto/consultas',
      })
      out.push({
        id: `appt-eve-fam|${a.id}|${elderId}`, at: eve, audience: 'familiar', elderId, section: 'con',
        timing: '1 día antes de una consulta',
        title: `Mañana: ${a.titulo} de ${name}`,
        body: `${a.hora}${a.con ? ` · ${a.con}` : ''} · ${a.lugar}.`,
        actions: [{ label: 'Ver agenda', type: 'link', payload: '/familiar/agenda', primary: true }],
        link: '/familiar/agenda',
      })
    }

    // Cambios en la agenda hechos por otra persona
    if (a.createdAt) {
      const when = new Date(a.createdAt)
      const fromNearby = a.id === nearbyActivityId(a.origenCerca, elderId)
      if (a.creadoPor !== elderId) {
        out.push({
          id: `added|${a.id}|${elderId}`, at: when, audience: 'adulto', elderId, section: 'pro',
          timing: 'Cuando un familiar agrega algo a su agenda',
          title: `${personName(s, a.creadoPor)} agregó ${a.tipo === 'consulta' ? 'una consulta' : 'una actividad'}`,
          body: `${a.titulo} · ${relativeDay(a.fecha, toISODate(now))} · ${a.hora}.`,
          actions: [{ label: 'Ver próximos días', type: 'link', payload: '/adulto/proximos', primary: true }],
          link: '/adulto/proximos',
        })
      }
      out.push({
        id: `edit|${a.id}|${elderId}`, at: when, audience: 'familiar', elderId, section: fromNearby ? 'cer' : 'pro',
        timing: fromNearby ? `Cuando ${name} suma una actividad cercana` : 'Cuando alguien del núcleo edita su agenda',
        title: a.creadoPor === elderId
          ? `${name} sumó ${a.titulo}`
          : `${personName(s, a.creadoPor)} agregó ${a.tipo === 'consulta' ? 'una consulta' : 'una actividad'} para ${name}`,
        body: `${a.titulo} · ${relativeDay(a.fecha, toISODate(now))} · ${a.hora}${a.lugar ? ` · ${a.lugar}` : ''}.`,
        actions: [{ label: 'Ver agenda', type: 'link', payload: '/familiar/agenda', primary: true }],
        creatorId: a.creadoPor,
        link: '/familiar/agenda',
      })
    }
  }

  // Actividades nuevas cerca
  for (const n of s.nearby) {
    out.push({
      id: `nearby|${n.id}|${elderId}`, at: new Date(n.publishedAt), audience: 'adulto', elderId, section: 'cer',
      timing: 'Cuando hay una actividad nueva cerca',
      title: 'Nueva actividad cerca de ti',
      body: `${n.titulo} · ${n.hora} · ${n.minutosCaminando <= 20 ? `a ${n.minutosCaminando} minutos caminando` : 'se recomienda usar vehículo'}.`,
      actions: [{ label: 'Verla', type: 'link', payload: '/adulto/cerca', primary: true }],
      resolved: s.activities.some((a) => a.id === nearbyActivityId(n.id, elderId)), resolvedLabel: 'En tu agenda',
      link: '/adulto/cerca',
    })
  }

  // Alertas que envió el servidor (stock que cruza el umbral, dosis no dadas en el ELEAM),
  // con el resultado del envío por WhatsApp. Reemplazan al aviso de stock calculado aquí.
  const today = toISODate(now)
  const serverAlerts = Array.isArray(s.alertas)
  for (const a of serverAlerts ? s.alertas : []) {
    if (a.personaId !== elderId) continue
    out.push({
      id: `alerta|${a.id}`, at: new Date(a.at), audience: 'familiar', elderId, section: 'acc',
      timing: a.tipo === 'omision' ? 'Cuando el ELEAM registra una dosis no dada' : 'Cuando el stock cruza un umbral',
      title: a.titulo,
      body: `${sinPrefijo(a.mensaje)} ${envioTexto(a)}`,
      actions: [{ label: 'Ver remedios', type: 'link', payload: '/familiar/remedios', primary: true }],
      link: '/familiar/remedios',
    })
  }

  // Stock bajo y resumen diario (familia). En modo local, sin alertas del servidor.
  for (const m of serverAlerts ? [] : medsOf(s, elderId)) {
    if (m.stockDias > 7) continue
    out.push({
      id: `stock|${m.id}|${today}|${m.stockDias}`, at: at(today, '09:00'), audience: 'familiar', elderId, section: 'acc',
      timing: 'Cuando el stock baja de 7 días',
      title: `A ${m.nombre} de ${name} le quedan ${m.stockDias} días`,
      body: `Responsable de la compra: ${personName(s, m.responsableId)}.`,
      actions: [{ label: 'Ver remedios', type: 'link', payload: '/familiar/remedios', primary: true }],
      link: '/familiar/remedios',
    })
  }
  for (const iso of [toISODate(addDays(now, -1)), today]) {
    const sum = daySummary(s, elderId, iso, now)
    out.push({
      id: `summary|${elderId}|${iso}`, at: at(iso, '21:30'), audience: 'familiar', elderId, section: 'rem',
      timing: 'Al cierre del día',
      title: `Resumen del día de ${name}`,
      body: [
        sum.dosesTotal ? `${sum.dosesTaken} de ${sum.dosesTotal} remedios tomados` : 'Sin remedios',
        sum.activities ? `${sum.attended} de ${sum.activities} actividades asistidas` : 'sin actividades',
      ].join(' · ') + '.',
      actions: [{ label: 'Ver resumen', type: 'link', payload: '/familiar/resumen', primary: true }],
      link: '/familiar/resumen',
    })
  }

  return out
}

/** Todos los avisos para quien está mirando. */
export function buildNotifications(s, now, { audience, elderIds, viewerId }) {
  return elderIds
    .filter((id) => elderById(s, id))
    .flatMap((id) => forElder(s, id, now))
    .filter((n) => n.audience === audience)
    // nadie recibe avisos de sus propios cambios
    .filter((n) => !(audience === 'familiar' && n.creatorId && n.creatorId === viewerId))
}

export const dueNotifications = (all, now, windowHours = 36) =>
  all
    .filter((n) => n.at <= now && n.at >= new Date(now.getTime() - windowHours * HOUR))
    .sort((a, b) => b.at - a.at)

export const scheduledNotifications = (all, now, windowHours = 48) =>
  all
    .filter((n) => n.at > now && n.at <= new Date(now.getTime() + windowHours * HOUR))
    .sort((a, b) => a.at - b.at)

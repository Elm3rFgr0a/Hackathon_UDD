const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const pad = (n) => String(n).padStart(2, '0')
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE

export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const toHHMM = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export const fromISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Fecha ISO + hora "HH:MM" → Date local. */
export const at = (iso, hhmm = '00:00') => {
  const [h, mi] = hhmm.split(':').map(Number)
  const d = fromISO(iso)
  d.setHours(h, mi, 0, 0)
  return d
}

export const daysBetween = (fromIso, toIso) =>
  Math.round((at(toIso, '12:00') - at(fromIso, '12:00')) / (24 * HOUR))

export const longDate = (iso) => {
  const d = fromISO(iso)
  return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

export const weekdayShort = (iso) => DIAS_CORTOS[fromISO(iso).getDay()]
export const weekdayLetter = (iso) => DIAS_CORTOS[fromISO(iso).getDay()].charAt(0)
export const dayNumber = (iso) => fromISO(iso).getDate()
export const monthName = (iso) => MESES[fromISO(iso).getMonth()]
export const monthYear = (iso) => {
  const d = fromISO(iso)
  return `${cap(MESES[d.getMonth()])} ${d.getFullYear()}`
}

/** "Hoy", "Mañana" o "Mar 6 oct". */
export const relativeDay = (iso, todayIso) => {
  const n = daysBetween(todayIso, iso)
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  if (n === -1) return 'Ayer'
  return `${weekdayShort(iso)} ${dayNumber(iso)} ${monthName(iso).slice(0, 3)}`
}

export const faltanTexto = (n, que) => {
  if (n <= 0) return `Hoy es ${que}`
  if (n === 1) return `Falta 1 día para ${que}`
  return `Faltan ${n} días para ${que}`
}

export const enCuanto = (from, to) => {
  const mins = Math.round((to - from) / MINUTE)
  if (mins <= 0) return 'ahora'
  if (mins < 60) return `en ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hs = `${h} ${h === 1 ? 'hora' : 'horas'}`
  return m ? `en ${hs} y ${m} min` : `en ${hs}`
}

export const haceCuanto = (from, now) => {
  const mins = Math.round((now - from) / MINUTE)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

export const saludo = (now) => {
  const h = now.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export const edad = (fechaNacimiento, now) => {
  const b = fromISO(fechaNacimiento)
  let e = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) e--
  return e
}

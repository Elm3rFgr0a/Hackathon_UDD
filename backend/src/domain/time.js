// Fechas y horas locales. Lambda corre en UTC, así que nunca usamos la zona del
// servidor para saber qué día u hora es: todo se calcula en APP_TZ.

const TZ = process.env.APP_TZ || 'America/Santiago';
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const isISODate = (s) => typeof s === 'string' && ISO_DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const isHHMM = (s) => typeof s === 'string' && HHMM_RE.test(s);

/** Fecha ('YYYY-MM-DD'), hora ('HH:mm') y segundos locales de un instante. */
function localParts(date, tz = TZ) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}`, segundo: p.second };
}

/** Desfase (ms) entre la hora local de `tz` y UTC en ese instante. Chile: -3 h o -4 h. */
function tzOffsetMs(date, tz = TZ) {
  const { fecha, hora, segundo } = localParts(date, tz);
  const wallAsUtc = Date.parse(`${fecha}T${hora}:${segundo}Z`);
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Suma días a una fecha 'YYYY-MM-DD' sin pasar por la zona horaria. */
function addDaysISO(fecha, n) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Instante de una fecha y hora locales, con el desfase indicado. */
const localToInstant = (fecha, hora, offsetMs) => new Date(Date.parse(`${fecha}T${hora}:00Z`) - offsetMs);

module.exports = { TZ, MINUTE, HOUR, isISODate, isHHMM, localParts, tzOffsetMs, addDaysISO, localToInstant };

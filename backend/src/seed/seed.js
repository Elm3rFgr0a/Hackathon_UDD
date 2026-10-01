// Datos de demostración, portados de frontend/src/data/seed.js (mismos ids y
// contenidos). Las fechas son relativas a `now`, en hora de Chile, para que la
// demo siempre tenga "hoy", "mañana" y "próximos días". Todo es ficticio.

const { keys } = require('../db/keys');
const { hashPassword } = require('../auth/password');
const { unidadesDesdeDias, UMBRAL_DIAS_DEFECTO } = require('../domain/stock');
const { HOUR, MINUTE, localParts, tzOffsetMs, addDaysISO, localToInstant } = require('../domain/time');

const SEED_GRUPO_ID = 'g-munoz';
const SEED_PASSWORD = '1234';

const elders = [
  { id: 'e-rosa', nombre: 'Rosa', apellido: 'Muñoz', fechaNacimiento: '1944-03-12', residencia: 'Vive en casa', telefono: '+56911112222', color: 'teal' },
  { id: 'e-hector', nombre: 'Héctor', apellido: 'Muñoz', fechaNacimiento: '1947-07-02', residencia: 'ELEAM Los Aromos', establecimientoId: 'est-los-aromos', telefono: '+56933334444', color: 'orange' },
];

const members = [
  { id: 'u-camila', nombre: 'Camila', apellido: 'Pérez', email: 'camila@cerca.cl', permiso: 'admin', estado: 'activo' },
  { id: 'u-jorge', nombre: 'Jorge', apellido: 'Muñoz', email: 'jorge@cerca.cl', permiso: 'edita', estado: 'activo' },
  { id: 'u-marta', nombre: 'Marta', apellido: 'Muñoz', email: 'marta@cerca.cl', permiso: 've', estado: 'activo' },
];

// Jorge y Marta no están en el front; sirven para probar los permisos `edita` y `ve`.
const accounts = [
  { email: 'rosa@cerca.cl', rol: 'adulto', personaId: 'e-rosa' },
  { email: 'hector@cerca.cl', rol: 'adulto', personaId: 'e-hector' },
  { email: 'camila@cerca.cl', rol: 'familiar', personaId: 'u-camila' },
  { email: 'jorge@cerca.cl', rol: 'familiar', personaId: 'u-jorge' },
  { email: 'marta@cerca.cl', rol: 'familiar', personaId: 'u-marta' },
];

// stockDias como en el front; se guarda en unidades.
const medications = [
  { id: 'm-metformina', elderId: 'e-rosa', nombre: 'Metformina', dosis: '850 mg', cantidad: '1 pastilla', indicacion: 'Con el desayuno', horarios: ['08:00'], stockDias: 6, responsableId: 'u-jorge' },
  { id: 'm-losartan', elderId: 'e-rosa', nombre: 'Losartán', dosis: '50 mg', cantidad: '1 pastilla', indicacion: 'Con agua', horarios: ['13:00'], stockDias: 22, responsableId: 'u-camila' },
  { id: 'm-atorvastatina', elderId: 'e-rosa', nombre: 'Atorvastatina', dosis: '20 mg', cantidad: '1 pastilla', indicacion: 'Antes de dormir', horarios: ['21:00'], stockDias: 18, responsableId: 'u-camila' },
  { id: 'm-levotiroxina', elderId: 'e-hector', nombre: 'Levotiroxina', dosis: '100 mcg', cantidad: '1 pastilla', indicacion: 'En ayunas', horarios: ['07:00'], stockDias: 30, responsableId: 'u-jorge' },
  { id: 'm-omeprazol', elderId: 'e-hector', nombre: 'Omeprazol', dosis: '20 mg', cantidad: '1 cápsula', indicacion: 'Antes del almuerzo', horarios: ['12:30'], stockDias: 4, responsableId: 'u-marta' },
];

/**
 * Construye todos los registros del seed para el instante `now`.
 * `reloj` se guarda en el grupo para que todos los dispositivos usen la misma hora de demo.
 */
async function buildSeedItems(now = new Date(), { relojOffsetMs = 0, reseteadoEn = now.toISOString() } = {}) {
  const g = SEED_GRUPO_ID;
  const today = localParts(now).fecha;
  const offset = tzOffsetMs(now);
  const day = (n) => addDaysISO(today, n);
  const at = (fecha, hora) => localToInstant(fecha, hora, offset);
  const ago = (h) => new Date(now.getTime() - h * HOUR).toISOString();

  const activities = [
    { id: 'a-gimnasia', elderIds: ['e-rosa'], tipo: 'actividad', icono: 'sun', titulo: 'Gimnasia suave', fecha: today, hora: '08:30', lugar: 'En casa', con: '', creadoPor: 'e-rosa', createdAt: ago(48) },
    { id: 'a-caminata', elderIds: ['e-rosa'], tipo: 'actividad', icono: 'walk', titulo: 'Caminata en la plaza', fecha: today, hora: '10:30', lugar: 'Plaza del barrio', con: 'Con Marta', creadoPor: 'u-marta', createdAt: ago(30) },
    { id: 'a-video', elderIds: ['e-rosa'], tipo: 'actividad', icono: 'video', titulo: 'Videollamada', fecha: today, hora: '16:00', lugar: 'Desde tu teléfono', con: 'Con tu nieta Camila', creadoPor: 'u-camila', createdAt: ago(2) },
    { id: 'a-once', elderIds: ['e-rosa'], tipo: 'actividad', icono: 'cup', titulo: 'Once en familia', fecha: today, hora: '18:30', lugar: 'En casa de Jorge', con: '', creadoPor: 'u-jorge', createdAt: ago(26) },
    { id: 'a-kine', elderIds: ['e-rosa'], tipo: 'actividad', icono: 'walk', titulo: 'Kinesiología', fecha: day(1), hora: '11:00', lugar: 'Centro de salud', con: '', creadoPor: 'u-camila', createdAt: ago(72) },
    { id: 'a-almuerzo', elderIds: ['e-rosa', 'e-hector'], tipo: 'actividad', icono: 'cup', titulo: 'Almuerzo familiar', fecha: day(2), hora: '13:30', lugar: 'Casa de Jorge', con: 'Todo el núcleo familiar', creadoPor: 'u-camila', createdAt: ago(5) },
    { id: 'c-cardio', elderIds: ['e-rosa'], tipo: 'consulta', icono: 'cross', titulo: 'Control de cardiología', fecha: day(5), hora: '10:00', lugar: 'Policlínico Central, piso 3', con: 'Dra. Soto', creadoPor: 'u-jorge', createdAt: ago(20) },
    { id: 'a-taller', elderIds: ['e-rosa'], tipo: 'actividad', icono: 'sun', titulo: 'Taller de memoria', fecha: day(7), hora: '16:00', lugar: 'Junta de vecinos', con: '', creadoPor: 'e-rosa', createdAt: ago(100) },
    { id: 'c-examen', elderIds: ['e-rosa'], tipo: 'consulta', icono: 'cross', titulo: 'Examen de sangre', fecha: day(14), hora: '09:30', lugar: 'Laboratorio Norte', con: 'En ayunas desde las 21:00', creadoPor: 'u-camila', createdAt: ago(40) },
    { id: 'a-musica', elderIds: ['e-hector'], tipo: 'actividad', icono: 'sun', titulo: 'Taller de música', fecha: today, hora: '11:00', lugar: 'Sala común del ELEAM', con: '', creadoPor: 'u-jorge', createdAt: ago(60) },
    { id: 'c-trauma', elderIds: ['e-hector'], tipo: 'consulta', icono: 'cross', titulo: 'Control de traumatología', fecha: day(3), hora: '15:00', lugar: 'Hospital del Salvador', con: 'Dr. Riquelme', creadoPor: 'u-jorge', createdAt: ago(50) },
  ];

  // Publicados por la municipalidad y organizaciones del barrio. La distancia es
  // un dato fijo del catálogo: no usamos la ubicación de la persona.
  const nearby = [
    { id: 'n-yoga', titulo: 'Taller de yoga suave', fecha: day(2), hora: '10:00', lugar: 'Centro Comunitario', organizador: 'Municipalidad', minutosCaminando: 6, distanciaKm: 0.5, publishedAt: ago(1) },
    { id: 'n-bingo', titulo: 'Bingo municipal', fecha: day(5), hora: '16:00', lugar: 'Biblioteca Municipal', organizador: 'Municipalidad', minutosCaminando: 12, distanciaKm: 0.9, publishedAt: ago(30) },
    { id: 'n-paseo', titulo: 'Paseo en el parque', fecha: day(10), hora: '11:00', lugar: 'Parque del Cerro', organizador: 'Club de adulto mayor', minutosCaminando: 55, distanciaKm: 4.2, publishedAt: ago(45) },
  ];

  const items = [];

  items.push({
    ...keys.grupo(g), entidad: 'GRUPO', id: g, nombre: 'Familia Muñoz',
    seededAt: now.toISOString(), relojOffsetMs, reseteadoEn,
  });

  for (const e of elders) {
    items.push({ ...keys.persona(g, e.id), entidad: 'PERSONA', ...e });
  }

  for (const m of members) {
    items.push({ ...keys.miembro(g, m.id), entidad: 'MIEMBRO', ...m });
  }

  for (const a of accounts) {
    items.push({ ...keys.cuenta(a.email), entidad: 'CUENTA', ...a, grupoId: g, passwordHash: await hashPassword(SEED_PASSWORD) });
  }

  for (const { elderId, stockDias, ...m } of medications) {
    const med = { ...m, personaId: elderId, unidadesPorToma: 1, umbralDias: UMBRAL_DIAS_DEFECTO, activo: true };
    items.push({ ...keys.med(g, m.id), entidad: 'MED', ...med, stockUnidades: unidadesDesdeDias(stockDias, med) });
  }

  for (const { elderIds, ...a } of activities) {
    items.push({ ...keys.evento(g, a.id), entidad: 'EVENTO', ...a, personaIds: elderIds });
  }

  for (const n of nearby) {
    items.push({ ...keys.cerca(n.fecha, n.id), entidad: 'CERCA', ...n });
  }

  // Tomas ya registradas: todo lo de ayer y lo de hoy que pasó hace más de 90 min.
  // El stock de arriba ya las descuenta, así que no generan movimientos.
  const toma = (m, fecha, hora, minutosDespues) => ({
    ...keys.toma(g, fecha, hora, m.id), entidad: 'TOMA',
    medId: m.id, personaId: m.elderId, fecha, hora,
    at: new Date(at(fecha, hora).getTime() + minutosDespues * MINUTE).toISOString(),
    registradaPor: m.elderId,
  });
  for (const m of medications) {
    for (const h of m.horarios) {
      items.push(toma(m, day(-1), h, 4));
      if (now - at(today, h) > 90 * MINUTE) items.push(toma(m, today, h, 6));
    }
  }

  // Asistencia ya respondida para actividades de hoy que empezaron hace más de 3 h.
  for (const a of activities) {
    if (a.tipo !== 'actividad' || a.fecha !== today) continue;
    const start = at(a.fecha, a.hora);
    if (now - start <= 3 * HOUR) continue;
    for (const personaId of a.elderIds) {
      items.push({
        ...keys.asistencia(g, a.id, personaId), entidad: 'ASIST',
        eventoId: a.id, personaId, value: 'asistio', at: new Date(start.getTime() + 70 * MINUTE).toISOString(),
      });
    }
  }

  return items;
}

/** Claves de cuenta del seed (para borrarlas en el reset). */
const seedAccountKeys = () => accounts.map((a) => keys.cuenta(a.email));

module.exports = { SEED_GRUPO_ID, buildSeedItems, seedAccountKeys };

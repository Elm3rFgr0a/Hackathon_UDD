import { addDays, at, toISODate, HOUR, MINUTE } from '../lib/dates'

/**
 * Datos de demostración. Las fechas se calculan a partir del momento en que se
 * crean, para que la app siempre tenga "hoy", "mañana" y "próximos días".
 * Cuando exista el backend (DynamoDB + Cognito) este archivo se reemplaza por
 * las respuestas de la API.
 */
export function createSeed(now = new Date()) {
  const day = (n) => toISODate(addDays(now, n))
  const today = day(0)

  const elders = [
    {
      id: 'e-rosa',
      nombre: 'Rosa',
      apellido: 'Muñoz',
      fechaNacimiento: '1944-03-12',
      rut: '4.512.334-7',
      residencia: 'Vive en casa',
      telefono: '+56911112222',
      color: 'teal',
    },
    {
      id: 'e-hector',
      nombre: 'Héctor',
      apellido: 'Muñoz',
      fechaNacimiento: '1947-07-02',
      rut: '5.103.876-2',
      residencia: 'ELEAM Los Aromos',
      telefono: '+56933334444',
      color: 'orange',
    },
  ]

  const members = [
    { id: 'u-camila', nombre: 'Camila', apellido: 'Pérez', email: 'camila@cerca.cl', permiso: 'admin', estado: 'activo' },
    { id: 'u-jorge', nombre: 'Jorge', apellido: 'Muñoz', email: 'jorge@cerca.cl', permiso: 'edita', estado: 'activo' },
    { id: 'u-marta', nombre: 'Marta', apellido: 'Muñoz', email: 'marta@cerca.cl', permiso: 've', estado: 'activo' },
  ]

  const accounts = [
    { email: 'rosa@cerca.cl', password: '1234', rol: 'adulto', personId: 'e-rosa' },
    { email: 'hector@cerca.cl', password: '1234', rol: 'adulto', personId: 'e-hector' },
    { email: 'camila@cerca.cl', password: '1234', rol: 'familiar', personId: 'u-camila' },
  ]

  const medications = [
    { id: 'm-metformina', elderId: 'e-rosa', nombre: 'Metformina', dosis: '850 mg', cantidad: '1 pastilla', indicacion: 'Con el desayuno', horarios: ['08:00'], stockDias: 6, responsableId: 'u-jorge' },
    { id: 'm-losartan', elderId: 'e-rosa', nombre: 'Losartán', dosis: '50 mg', cantidad: '1 pastilla', indicacion: 'Con agua', horarios: ['13:00'], stockDias: 22, responsableId: 'u-camila' },
    { id: 'm-atorvastatina', elderId: 'e-rosa', nombre: 'Atorvastatina', dosis: '20 mg', cantidad: '1 pastilla', indicacion: 'Antes de dormir', horarios: ['21:00'], stockDias: 18, responsableId: 'u-camila' },
    { id: 'm-levotiroxina', elderId: 'e-hector', nombre: 'Levotiroxina', dosis: '100 mcg', cantidad: '1 pastilla', indicacion: 'En ayunas', horarios: ['07:00'], stockDias: 30, responsableId: 'u-jorge' },
    { id: 'm-omeprazol', elderId: 'e-hector', nombre: 'Omeprazol', dosis: '20 mg', cantidad: '1 cápsula', indicacion: 'Antes del almuerzo', horarios: ['12:30'], stockDias: 4, responsableId: 'u-marta' },
  ]

  const ago = (h) => new Date(now.getTime() - h * HOUR).toISOString()

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
  ]

  // Eventos cercanos publicados por la municipalidad y organizaciones del barrio.
  const nearby = [
    { id: 'n-yoga', titulo: 'Taller de yoga suave', fecha: day(2), hora: '10:00', lugar: 'Centro Comunitario', organizador: 'Municipalidad', minutosCaminando: 6, distanciaKm: 0.5, publishedAt: ago(1) },
    { id: 'n-bingo', titulo: 'Bingo municipal', fecha: day(5), hora: '16:00', lugar: 'Biblioteca Municipal', organizador: 'Municipalidad', minutosCaminando: 12, distanciaKm: 0.9, publishedAt: ago(30) },
    { id: 'n-paseo', titulo: 'Paseo en el parque', fecha: day(10), hora: '11:00', lugar: 'Parque del Cerro', organizador: 'Club de adulto mayor', minutosCaminando: 55, distanciaKm: 4.2, publishedAt: ago(45) },
  ]

  // Tomas ya registradas: todo lo de ayer y lo de hoy que pasó hace más de 90 min.
  const intakes = {}
  for (const m of medications) {
    for (const h of m.horarios) {
      const y = day(-1)
      intakes[`${m.id}|${y}|${h}`] = { at: new Date(at(y, h).getTime() + 4 * MINUTE).toISOString() }
      const when = at(today, h)
      if (now - when > 90 * MINUTE) {
        intakes[`${m.id}|${today}|${h}`] = { at: new Date(when.getTime() + 6 * MINUTE).toISOString() }
      }
    }
  }

  // Asistencia ya respondida para actividades de hoy que empezaron hace más de 3 h.
  const attendance = {}
  for (const a of activities) {
    if (a.tipo !== 'actividad' || a.fecha !== today) continue
    const start = at(a.fecha, a.hora)
    if (now - start > 3 * HOUR) {
      for (const eid of a.elderIds) {
        attendance[`${a.id}|${eid}`] = { value: 'asistio', at: new Date(start.getTime() + 70 * MINUTE).toISOString() }
      }
    }
  }

  return {
    version: 1,
    seededAt: now.toISOString(),
    elders,
    members,
    accounts,
    medications,
    activities,
    nearby,
    intakes,
    attendance,
    seen: {},
  }
}

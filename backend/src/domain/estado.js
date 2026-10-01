// Arma la respuesta de GET /estado con la misma forma que frontend/src/data/seed.js,
// para que el front pueda reemplazar localStorage sin cambiar sus pantallas.

const { stockDias, semaforo } = require('./stock');

const sinClaves = ({ PK, SK, entidad, ...rest }) => rest;

// Lista explícita de campos: lo que no está aquí (por ejemplo, un RUT) nunca sale de la API.
const aElder = ({ id, nombre, apellido, fechaNacimiento, residencia, establecimientoId, telefono, color }) =>
  ({ id, nombre, apellido, fechaNacimiento, residencia, establecimientoId, telefono, color });

function aMedication(m) {
  const dias = stockDias(m);
  return {
    id: m.id, elderId: m.personaId, nombre: m.nombre, dosis: m.dosis, cantidad: m.cantidad,
    indicacion: m.indicacion, horarios: m.horarios, responsableId: m.responsableId,
    stockDias: dias, semaforo: semaforo(dias, m.umbralDias),
    stockUnidades: m.stockUnidades, unidadesPorToma: m.unidadesPorToma, umbralDias: m.umbralDias,
  };
}

const aActivity = ({ personaIds, ...e }) => ({ ...sinClaves(e), elderIds: personaIds });

const aNearby = (n) => sinClaves(n);

const MAX_ALERTAS = 50;

const porFechaHora = (a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`);

/**
 * items: registros de la partición del grupo. cercaItems: catálogo "cerca de mí".
 * sesion: { personaId, rol, grupoId }.
 * Un adulto mayor recibe solo lo suyo y el nombre de los miembros de su núcleo.
 */
function construirEstado(items, cercaItems, sesion) {
  const de = (entidad) => items.filter((i) => i.entidad === entidad);
  const esAdulto = sesion.rol === 'adulto';
  const visible = (personaId) => !esAdulto || personaId === sesion.personaId;

  const grupo = de('GRUPO')[0];
  const elders = de('PERSONA').filter((p) => visible(p.id)).map(aElder);
  const medsRaw = de('MED').filter((m) => m.activo !== false && visible(m.personaId));
  const medIds = new Set(medsRaw.map((m) => m.id));

  const members = de('MIEMBRO').map((m) =>
    esAdulto
      ? { id: m.id, nombre: m.nombre, apellido: m.apellido }
      : { id: m.id, nombre: m.nombre, apellido: m.apellido, email: m.email, telefono: m.telefono ?? '', permiso: m.permiso, estado: m.estado },
  );

  const activities = de('EVENTO')
    .filter((e) => !esAdulto || e.personaIds.includes(sesion.personaId))
    .map(aActivity)
    .sort(porFechaHora);

  const intakes = {};
  for (const t of de('TOMA')) {
    if (medIds.has(t.medId)) intakes[`${t.medId}|${t.fecha}|${t.hora}`] = { at: t.at };
  }

  const attendance = {};
  for (const a of de('ASIST')) {
    if (visible(a.personaId)) attendance[`${a.eventoId}|${a.personaId}`] = { value: a.value, at: a.at };
  }

  // Dosis que el personal de un ELEAM registró como no dadas, con su motivo.
  const omissions = {};
  for (const o of de('OMISION')) {
    if (medIds.has(o.medId)) omissions[`${o.medId}|${o.fecha}|${o.hora}`] = { motivo: o.motivo, at: o.at };
  }

  // Alertas que envió el servidor (stock bajo, dosis no dadas). Solo para la familia.
  const alertas = esAdulto
    ? []
    : de('ALERTA')
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, MAX_ALERTAS)
      .map(({ id, tipo, nivel, titulo, mensaje, personaId, medId, at, canal, estado, destinatarios }) =>
        ({ id, tipo, nivel, titulo, mensaje, personaId, medId, at, canal, estado, destinatarios: (destinatarios ?? []).map((d) => d.nombre) }));

  // Cada quien recibe solo sus propios avisos vistos.
  const seen = {};
  for (const v of de('VISTO')) {
    if (v.viewerId === sesion.personaId) seen[`${v.viewerId}|${v.avisoId}`] = true;
  }

  return {
    version: 1,
    grupo: grupo ? { id: grupo.id, nombre: grupo.nombre } : null,
    seededAt: grupo?.seededAt ?? null,
    // Hora de demo compartida: desfase entre la hora simulada y la real, fijado en el último reset.
    reloj: grupo ? { offsetMs: grupo.relojOffsetMs ?? 0, desde: grupo.reseteadoEn ?? grupo.seededAt } : null,
    elders,
    members,
    medications: medsRaw.map(aMedication),
    activities,
    nearby: cercaItems.filter((n) => n.entidad === 'CERCA').map(aNearby).sort(porFechaHora),
    intakes,
    attendance,
    omissions,
    alertas,
    seen,
  };
}

module.exports = { construirEstado };

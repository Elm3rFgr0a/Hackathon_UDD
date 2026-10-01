// Vista del personal de un ELEAM (fase D). Ve a todos los residentes de su
// establecimiento, sin importar a qué grupo familiar pertenecen, gracias al
// índice GSI1. Su alcance sale del token (establecimientoId), nunca del cliente.

const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { requireEleam } = require('../auth/token');
const { getItem, putItem, queryIndex, queryPrefix, isConditionFailed } = require('../db/repo');
const { keys, grupoPK, estabPK } = require('../db/keys');
const { check } = require('../domain/validar');
const { localParts } = require('../domain/time');
const { stockDias, semaforo } = require('../domain/stock');
const { MOTIVOS } = require('../domain/alertas');
const { establecimientoPorId } = require('../domain/establecimientos');
const { registrarToma } = require('../services/tomas');
const { alertarOmision } = require('../services/alertas');

const router = express.Router();

const MAX_EXCEPCIONES = 100;

const grupoDe = (item) => item.PK.slice('GRUPO#'.length);

/** Residentes y remedios activos del establecimiento, cada uno con su grupo. */
async function residentesDe(estId) {
  const items = await queryIndex(estabPK(estId));
  const personas = new Map();
  const meds = [];
  for (const i of items) {
    if (i.entidad === 'PERSONA') personas.set(i.id, { ...i, grupoId: grupoDe(i) });
    if (i.entidad === 'MED' && i.activo !== false) meds.push({ ...i, grupoId: grupoDe(i) });
  }
  return { personas, meds: meds.filter((m) => personas.has(m.personaId)) };
}

/** Tomas y dosis no dadas de un día, en todos los grupos involucrados. Clave: `medId|hora`. */
async function registrosDelDia(grupoIds, fecha) {
  const tomas = new Map();
  const omisiones = new Map();
  await Promise.all([...grupoIds].map(async (g) => {
    const [ts, os] = await Promise.all([
      queryPrefix(grupoPK(g), `TOMA#${fecha}#`),
      queryPrefix(grupoPK(g), `OMISION#${fecha}#`),
    ]);
    for (const t of ts) tomas.set(`${t.medId}|${t.hora}`, t);
    for (const o of os) omisiones.set(`${o.medId}|${o.hora}`, o);
  }));
  return { tomas, omisiones };
}

const hoyLocal = () => localParts(new Date()).fecha;

router.get('/eleam/ronda', requireEleam, asyncHandler(async (req, res) => {
  const { fecha = hoyLocal() } = check(req.query).fecha('fecha', { req: false }).done();
  const estId = req.sesion.establecimientoId;

  const [{ personas, meds }, personal, est] = await Promise.all([
    residentesDe(estId),
    getItem(keys.personal(estId, req.sesion.personaId)),
    getItem(keys.establecimiento(estId)),
  ]);
  const { tomas, omisiones } = await registrosDelDia(new Set(meds.map((m) => m.grupoId)), fecha);

  const dosis = [];
  for (const m of meds) {
    const dias = stockDias(m);
    for (const hora of m.horarios) {
      const toma = tomas.get(`${m.id}|${hora}`);
      const omision = omisiones.get(`${m.id}|${hora}`);
      dosis.push({
        medId: m.id, personaId: m.personaId, hora,
        nombre: m.nombre, dosis: m.dosis, cantidad: m.cantidad, indicacion: m.indicacion,
        estado: toma ? 'dada' : omision ? 'omitida' : 'pendiente',
        ...(toma && { at: toma.at }),
        ...(omision && { at: omision.at, motivo: omision.motivo, motivoTexto: MOTIVOS[omision.motivo] }),
        stockDias: dias, semaforo: semaforo(dias, m.umbralDias),
      });
    }
  }
  dosis.sort((a, b) => a.hora.localeCompare(b.hora) || a.personaId.localeCompare(b.personaId));

  // Sin grupoId ni datos de contacto: el personal solo necesita lo de la ronda.
  const residentes = [...personas.values()]
    .map(({ id, nombre, apellido, color }) => ({ id, nombre, apellido, color }))
    .sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));

  res.json({
    establecimiento: establecimientoPorId(estId) ?? { id: estId, nombre: estId },
    personal: personal ? { id: personal.id, nombre: personal.nombre, apellido: personal.apellido } : null,
    // Hora de demo compartida (la misma que reciben las familias en /estado).
    reloj: est?.reseteadoEn ? { offsetMs: est.relojOffsetMs ?? 0, desde: est.reseteadoEn } : null,
    fecha,
    horas: [...new Set(dosis.map((d) => d.hora))].sort(),
    residentes,
    dosis,
    motivos: MOTIVOS,
  });
}));

/**
 * Ronda con excepciones: marca como dadas todas las dosis pendientes de una
 * hora, salvo las de `excepciones`, que quedan como no dadas con su motivo y
 * avisan a la familia. Repetirla no duplica nada.
 */
router.post('/eleam/ronda/marcar', requireEleam, asyncHandler(async (req, res) => {
  const { fecha, hora, at } = check(req.body)
    .fecha('fecha').hora('hora').instante('at', { defecto: new Date().toISOString() }).done();
  const excepciones = req.body?.excepciones ?? [];
  if (!Array.isArray(excepciones) || excepciones.length > MAX_EXCEPCIONES) {
    throw new HttpError(400, `excepciones debe ser una lista de hasta ${MAX_EXCEPCIONES} elementos.`);
  }
  const motivoDe = new Map();
  for (const e of excepciones) {
    const { medId, motivo } = check(e).id('medId').opcion('motivo', Object.keys(MOTIVOS)).done();
    motivoDe.set(medId, motivo);
  }

  const estId = req.sesion.establecimientoId;
  const { personas, meds } = await residentesDe(estId);
  const deLaHora = meds.filter((m) => m.horarios.includes(hora));
  const ajenas = [...motivoDe.keys()].filter((id) => !deLaHora.some((m) => m.id === id));
  if (ajenas.length) throw new HttpError(400, `No hay dosis de las ${hora} para: ${ajenas.join(', ')}`);

  const { tomas, omisiones } = await registrosDelDia(new Set(deLaHora.map((m) => m.grupoId)), fecha);
  const establecimiento = establecimientoPorId(estId);
  const quien = req.sesion.personaId;
  const resumen = { dadas: 0, omitidas: 0, yaRegistradas: 0, alertas: 0 };

  await Promise.all(deLaHora.map(async (med) => {
    const g = med.grupoId;
    if (tomas.has(`${med.id}|${hora}`) || omisiones.has(`${med.id}|${hora}`)) {
      resumen.yaRegistradas += 1;
      return;
    }
    const motivo = motivoDe.get(med.id);
    if (!motivo) {
      const r = await registrarToma(g, med, { fecha, hora, at, quien });
      if (r.yaRegistrada) resumen.yaRegistradas += 1;
      else resumen.dadas += 1;
      if (r.alerta) resumen.alertas += 1;
      return;
    }
    try {
      await putItem({
        ...keys.omision(g, fecha, hora, med.id), entidad: 'OMISION',
        medId: med.id, personaId: med.personaId, fecha, hora, motivo, at, registradaPor: quien, establecimientoId: estId,
      }, { ifNotExists: true });
    } catch (err) {
      if (!isConditionFailed(err)) throw err;
      resumen.yaRegistradas += 1;
      return;
    }
    resumen.omitidas += 1;
    const alerta = await alertarOmision(g, { med, persona: personas.get(med.personaId), hora, motivo, establecimiento, at });
    if (alerta) resumen.alertas += 1;
  }));

  res.json({ ok: true, fecha, hora, ...resumen });
}));

module.exports = router;

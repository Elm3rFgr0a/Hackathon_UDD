// Agenda: actividades y consultas, asistencia y actividades cercanas.

const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { requireAuth } = require('../auth/token');
const { exigirPermiso, exigirSobrePersona } = require('../auth/permisos');
const { getItem, putItem, deleteItem, queryPartition, isConditionFailed } = require('../db/repo');
const { keys, CERCA_PK } = require('../db/keys');
const { check } = require('../domain/validar');

const router = express.Router();

const ahora = () => new Date().toISOString();

/** Verifica que todas las personas existan en el grupo. */
async function exigirPersonas(grupoId, personaIds) {
  const encontradas = await Promise.all(personaIds.map((id) => getItem(keys.persona(grupoId, id))));
  const faltan = personaIds.filter((_, i) => !encontradas[i]);
  if (faltan.length) throw new HttpError(404, `Persona no encontrada: ${faltan.join(', ')}`);
}

router.put('/asistencias', requireAuth, asyncHandler(async (req, res) => {
  const { eventoId, personaId, value, at } = check(req.body)
    .id('eventoId').id('personaId').opcion('value', ['asistio', 'no']).instante('at', { defecto: ahora() }).done();
  const g = req.sesion.grupoId;
  exigirSobrePersona(req.sesion, personaId);

  const evento = await getItem(keys.evento(g, eventoId));
  if (!evento) throw new HttpError(404, 'Actividad no encontrada.');
  if (!evento.personaIds.includes(personaId)) throw new HttpError(400, 'Esa persona no participa en la actividad.');

  await putItem({
    ...keys.asistencia(g, eventoId, personaId), entidad: 'ASIST',
    eventoId, personaId, value, at, registradaPor: req.sesion.personaId,
  });
  res.json({ ok: true });
}));

// Suma una actividad del catálogo "cerca de mí" a la agenda. Idempotente: el id
// del evento es fijo (`cerca-<actividad>-<persona>`), igual que en el front.
router.post('/cerca/:id/sumar', requireAuth, asyncHandler(async (req, res) => {
  const { id } = check(req.params).id('id').done();
  const { personaId, at } = check(req.body).id('personaId').instante('at', { defecto: ahora() }).done();
  const g = req.sesion.grupoId;
  exigirSobrePersona(req.sesion, personaId);
  await exigirPersonas(g, [personaId]);

  const cerca = (await queryPartition(CERCA_PK)).find((n) => n.entidad === 'CERCA' && n.id === id);
  if (!cerca) throw new HttpError(404, 'Actividad cercana no encontrada.');

  const eventoId = `cerca-${id}-${personaId}`;
  try {
    await putItem({
      ...keys.evento(g, eventoId), entidad: 'EVENTO',
      id: eventoId, origenCerca: id, tipo: 'actividad', icono: 'pin',
      titulo: cerca.titulo, fecha: cerca.fecha, hora: cerca.hora, lugar: cerca.lugar, con: cerca.organizador,
      personaIds: [personaId], creadoPor: req.sesion.personaId, createdAt: at,
    }, { ifNotExists: true });
  } catch (err) {
    if (isConditionFailed(err)) return res.json({ ok: true, id: eventoId, yaEstaba: true });
    throw err;
  }
  return res.status(201).json({ ok: true, id: eventoId });
}));

router.post('/eventos', requireAuth, exigirPermiso('edita'), asyncHandler(async (req, res) => {
  const e = check(req.body)
    .id('id')
    .opcion('tipo', ['actividad', 'consulta'])
    .texto('icono', { max: 20, defecto: 'sun' })
    .texto('titulo', { req: true, max: 120 })
    .fecha('fecha')
    .hora('hora')
    .texto('lugar', { max: 120, defecto: '' })
    .texto('con', { max: 120, defecto: '' })
    .ids('elderIds')
    .instante('createdAt', { defecto: ahora() })
    .done();
  const g = req.sesion.grupoId;
  await exigirPersonas(g, e.elderIds);

  const { elderIds, ...datos } = e;
  try {
    await putItem({
      ...keys.evento(g, e.id), entidad: 'EVENTO', ...datos, personaIds: elderIds, creadoPor: req.sesion.personaId,
    }, { ifNotExists: true });
  } catch (err) {
    if (isConditionFailed(err)) throw new HttpError(409, 'Ya existe una actividad con ese id.');
    throw err;
  }
  res.status(201).json({ ok: true, id: e.id });
}));

router.delete('/eventos/:id', requireAuth, exigirPermiso('edita'), asyncHandler(async (req, res) => {
  const { id } = check(req.params).id('id').done();
  const key = keys.evento(req.sesion.grupoId, id);
  if (!(await getItem(key))) throw new HttpError(404, 'Actividad no encontrada.');
  await deleteItem(key);
  res.json({ ok: true });
}));

module.exports = router;

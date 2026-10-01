// Personas mayores y miembros del núcleo. Solo un familiar `admin` los gestiona.

const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { requireAuth } = require('../auth/token');
const { exigirPermiso } = require('../auth/permisos');
const { getItem, putItem, updateFields, queryPrefix, isConditionFailed } = require('../db/repo');
const { keys, grupoPK, gsiEstablecimiento } = require('../db/keys');
const { check } = require('../domain/validar');
const { establecimientoDeResidencia } = require('../domain/establecimientos');

const router = express.Router();

// Lista cerrada de campos: lo que no está aquí (por ejemplo, un RUT) no se guarda.
const validarPersona = (body) => check(body)
  .texto('nombre', { req: true, max: 60 })
  .texto('apellido', { req: true, max: 60 })
  .fecha('fechaNacimiento')
  .texto('residencia', { max: 80, defecto: '' })
  .texto('telefono', { max: 20, defecto: '' })
  .texto('color', { max: 20, defecto: 'blue' });

/** El establecimiento sale de la residencia elegida en el formulario, nunca del cliente. */
const conEstablecimiento = (persona) => ({ ...persona, establecimientoId: establecimientoDeResidencia(persona.residencia) ?? undefined });

router.post('/personas', requireAuth, exigirPermiso('admin'), asyncHandler(async (req, res) => {
  const persona = conEstablecimiento(validarPersona(req.body).id('id').done());
  const g = req.sesion.grupoId;
  try {
    await putItem({
      ...keys.persona(g, persona.id), entidad: 'PERSONA', ...persona,
      ...gsiEstablecimiento(persona.establecimientoId, g, 'PERSONA', persona.id),
    }, { ifNotExists: true });
  } catch (err) {
    if (isConditionFailed(err)) throw new HttpError(409, 'Ya existe una persona con ese id.');
    throw err;
  }
  res.status(201).json({ ok: true, id: persona.id });
}));

router.put('/personas/:id', requireAuth, exigirPermiso('admin'), asyncHandler(async (req, res) => {
  const { id } = check(req.params).id('id').done();
  const datos = conEstablecimiento(validarPersona(req.body).done());
  const g = req.sesion.grupoId;
  const key = keys.persona(g, id);
  const actual = await getItem(key);
  if (!actual) throw new HttpError(404, 'Persona no encontrada.');

  // Sin establecimiento, los atributos del índice se quitan (undefined → REMOVE).
  const gsi = (tipo, itemId) => ({ GSI1PK: undefined, GSI1SK: undefined, ...gsiEstablecimiento(datos.establecimientoId, g, tipo, itemId) });
  await updateFields(key, { ...datos, ...gsi('PERSONA', id) });

  // Si cambió de establecimiento, sus remedios se mueven con ella a la ronda correspondiente.
  if ((actual.establecimientoId ?? null) !== (datos.establecimientoId ?? null)) {
    const meds = (await queryPrefix(grupoPK(g), 'MED#')).filter((m) => m.personaId === id);
    await Promise.all(meds.map((m) => updateFields(keys.med(g, m.id), gsi('MED', m.id))));
  }
  res.json({ ok: true });
}));

// Invitar no crea una cuenta: el miembro queda "invitado" hasta que se registre.
router.post('/miembros', requireAuth, exigirPermiso('admin'), asyncHandler(async (req, res) => {
  const m = check(req.body)
    .id('id')
    .texto('nombre', { req: true, max: 60 })
    .texto('apellido', { max: 60, defecto: '·' })
    .email('email')
    .telefono('telefono')
    .opcion('permiso', ['admin', 'edita', 've'])
    .done();
  try {
    await putItem({ ...keys.miembro(req.sesion.grupoId, m.id), entidad: 'MIEMBRO', ...m, estado: 'invitado' }, { ifNotExists: true });
  } catch (err) {
    if (isConditionFailed(err)) throw new HttpError(409, 'Ya existe un miembro con ese id.');
    throw err;
  }
  res.status(201).json({ ok: true, id: m.id });
}));

module.exports = router;

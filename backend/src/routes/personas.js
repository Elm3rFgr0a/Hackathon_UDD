// Personas mayores y miembros del núcleo. Solo un familiar `admin` los gestiona.

const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { requireAuth } = require('../auth/token');
const { exigirPermiso } = require('../auth/permisos');
const { getItem, putItem, updateFields, isConditionFailed } = require('../db/repo');
const { keys } = require('../db/keys');
const { check } = require('../domain/validar');

const router = express.Router();

// Lista cerrada de campos: lo que no está aquí (por ejemplo, un RUT) no se guarda.
const validarPersona = (body) => check(body)
  .texto('nombre', { req: true, max: 60 })
  .texto('apellido', { req: true, max: 60 })
  .fecha('fechaNacimiento')
  .texto('residencia', { max: 80, defecto: '' })
  .texto('telefono', { max: 20, defecto: '' })
  .texto('color', { max: 20, defecto: 'blue' });

router.post('/personas', requireAuth, exigirPermiso('admin'), asyncHandler(async (req, res) => {
  const persona = validarPersona(req.body).id('id').done();
  try {
    await putItem({ ...keys.persona(req.sesion.grupoId, persona.id), entidad: 'PERSONA', ...persona }, { ifNotExists: true });
  } catch (err) {
    if (isConditionFailed(err)) throw new HttpError(409, 'Ya existe una persona con ese id.');
    throw err;
  }
  res.status(201).json({ ok: true, id: persona.id });
}));

router.put('/personas/:id', requireAuth, exigirPermiso('admin'), asyncHandler(async (req, res) => {
  const { id } = check(req.params).id('id').done();
  const datos = validarPersona(req.body).done();
  const key = keys.persona(req.sesion.grupoId, id);
  if (!(await getItem(key))) throw new HttpError(404, 'Persona no encontrada.');
  await updateFields(key, datos);
  res.json({ ok: true });
}));

// Invitar no crea una cuenta: el miembro queda "invitado" hasta que se registre.
router.post('/miembros', requireAuth, exigirPermiso('admin'), asyncHandler(async (req, res) => {
  const m = check(req.body)
    .id('id')
    .texto('nombre', { req: true, max: 60 })
    .texto('apellido', { max: 60, defecto: '·' })
    .email('email')
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

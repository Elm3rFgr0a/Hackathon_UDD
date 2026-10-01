// Remedios. El formulario del front trabaja en días de stock; aquí se guardan unidades.

const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { requireAuth } = require('../auth/token');
const { exigirPermiso } = require('../auth/permisos');
const { getItem, putItem, updateFields, transact, isConditionFailed, cancellationCodes } = require('../db/repo');
const { keys, gsiEstablecimiento } = require('../db/keys');
const { check } = require('../domain/validar');
const { stockDias, unidadesDesdeDias, UMBRAL_DIAS_DEFECTO } = require('../domain/stock');
const { movimiento, resumenStock } = require('../services/tomas');

const router = express.Router();

const validarMed = (body) => check(body)
  .texto('nombre', { req: true, max: 80 })
  .texto('dosis', { req: true, max: 40 })
  .texto('cantidad', { max: 40, defecto: '1 pastilla' })
  .texto('indicacion', { max: 120, defecto: '' })
  .horarios('horarios')
  .entero('stockDias', { min: 0, max: 3650 })
  .id('responsableId', { req: false });

async function exigirResponsable(grupoId, responsableId) {
  if (responsableId && !(await getItem(keys.miembro(grupoId, responsableId)))) {
    throw new HttpError(400, 'El responsable de la compra no es parte del núcleo.');
  }
}

async function cargarMed(grupoId, id) {
  const med = await getItem(keys.med(grupoId, id));
  if (!med || med.activo === false) throw new HttpError(404, 'Remedio no encontrado.');
  return med;
}

router.post('/medicamentos', requireAuth, exigirPermiso('edita'), asyncHandler(async (req, res) => {
  const { id, elderId, stockDias: dias, ...datos } = validarMed(req.body).id('id').id('elderId').done();
  const g = req.sesion.grupoId;
  const persona = await getItem(keys.persona(g, elderId));
  if (!persona) throw new HttpError(404, 'Persona no encontrada.');
  await exigirResponsable(g, datos.responsableId);

  const med = { ...datos, id, personaId: elderId, unidadesPorToma: 1, umbralDias: UMBRAL_DIAS_DEFECTO, activo: true };
  try {
    await putItem({
      ...keys.med(g, id), entidad: 'MED', ...med, stockUnidades: unidadesDesdeDias(dias, med),
      // Si la persona vive en un ELEAM, el remedio aparece en su ronda.
      ...gsiEstablecimiento(persona.establecimientoId, g, 'MED', id),
    }, { ifNotExists: true });
  } catch (err) {
    if (isConditionFailed(err)) throw new HttpError(409, 'Ya existe un remedio con ese id.');
    throw err;
  }
  res.status(201).json({ ok: true, id });
}));

router.put('/medicamentos/:id', requireAuth, exigirPermiso('edita'), asyncHandler(async (req, res) => {
  const { id } = check(req.params).id('id').done();
  const { stockDias: dias, ...datos } = validarMed(req.body).done();
  const g = req.sesion.grupoId;
  const actual = await cargarMed(g, id);
  await exigirResponsable(g, datos.responsableId);

  // Solo se recalculan las unidades si la persona cambió los días en el formulario.
  // Se compara con el stock que tenía el formulario al abrirse (el front reenvía
  // `stockUnidades`), no con el actual: si alguien registró una toma mientras tanto,
  // guardar sin tocar el stock no debe deshacerla.
  const unidadesVistas = Number.isInteger(req.body.stockUnidades) ? req.body.stockUnidades : actual.stockUnidades;
  const stockUnidades = dias === stockDias({ ...actual, stockUnidades: unidadesVistas })
    ? actual.stockUnidades
    : unidadesDesdeDias(dias, { ...actual, horarios: datos.horarios });

  await updateFields(keys.med(g, id), { ...datos, responsableId: datos.responsableId ?? null, stockUnidades });
  res.json({ ok: true });
}));

// "Ya compré": suma las unidades compradas y deja un movimiento COMPRA.
router.post('/medicamentos/:id/compras', requireAuth, exigirPermiso('edita'), asyncHandler(async (req, res) => {
  const { id } = check(req.params).id('id').done();
  const { unidades, at } = check(req.body).entero('unidades', { min: 1, max: 1000 }).instante('at', { defecto: new Date().toISOString() }).done();
  const g = req.sesion.grupoId;
  const med = await cargarMed(g, id);

  try {
    await transact([
      {
        Update: {
          Key: keys.med(g, id),
          UpdateExpression: 'SET stockUnidades = stockUnidades + :u',
          ConditionExpression: 'attribute_exists(PK)',
          ExpressionAttributeValues: { ':u': unidades },
        },
      },
      { Put: { Item: movimiento(g, { medId: id, tipo: 'COMPRA', unidades, registradoPor: req.sesion.personaId, at }) } },
    ]);
  } catch (err) {
    if (cancellationCodes(err)?.[0] === 'ConditionalCheckFailed') throw new HttpError(404, 'Remedio no encontrado.');
    throw err;
  }
  res.status(201).json({ ok: true, ...resumenStock(med, med.stockUnidades + unidades) });
}));

// Se marca como inactivo para conservar su historial de tomas y movimientos.
router.delete('/medicamentos/:id', requireAuth, exigirPermiso('edita'), asyncHandler(async (req, res) => {
  const { id } = check(req.params).id('id').done();
  await cargarMed(req.sesion.grupoId, id);
  await updateFields(keys.med(req.sesion.grupoId, id), { activo: false });
  res.json({ ok: true });
}));

module.exports = router;

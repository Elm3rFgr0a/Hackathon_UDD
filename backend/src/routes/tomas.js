// Tomas de medicamentos. Registrar una toma descuenta stock en la misma
// transacción; repetirla no descuenta dos veces.

const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { requireAuth } = require('../auth/token');
const { exigirSobrePersona } = require('../auth/permisos');
const { getItem, transact, cancellationCodes } = require('../db/repo');
const { keys } = require('../db/keys');
const { check } = require('../domain/validar');
const { registrarToma, movimiento, resumenStock } = require('../services/tomas');

const router = express.Router();

router.put('/tomas', requireAuth, asyncHandler(async (req, res) => {
  const { medId, fecha, hora, at } = check(req.body)
    .id('medId').fecha('fecha').hora('hora').instante('at', { defecto: new Date().toISOString() }).done();
  const { grupoId: g, personaId: quien } = req.sesion;

  const med = await getItem(keys.med(g, medId));
  if (!med || med.activo === false) throw new HttpError(404, 'Remedio no encontrado.');
  exigirSobrePersona(req.sesion, med.personaId);
  if (!med.horarios.includes(hora)) throw new HttpError(400, 'Ese horario no corresponde a este remedio.');

  const { yaRegistrada, alerta, ...stock } = await registrarToma(g, med, { fecha, hora, at, quien });
  if (yaRegistrada) return res.json({ ok: true, yaRegistrada: true });
  return res.status(201).json({ ok: true, ...stock, ...(alerta && { alerta: { id: alerta.id, estado: alerta.estado } }) });
}));

// Acepta los datos en el body o en la query (algunos clientes no envían body en DELETE).
router.delete('/tomas', requireAuth, asyncHandler(async (req, res) => {
  const fuente = req.body && Object.keys(req.body).length ? req.body : req.query;
  const { medId, fecha, hora } = check(fuente).id('medId').fecha('fecha').hora('hora').done();
  const { grupoId: g, personaId: quien } = req.sesion;

  const toma = await getItem(keys.toma(g, fecha, hora, medId));
  if (!toma) return res.json({ ok: true, yaNoExistia: true });
  exigirSobrePersona(req.sesion, toma.personaId);

  // Las tomas del seed no guardan `unidades`: su consumo ya estaba descontado del stock inicial.
  const med = await getItem(keys.med(g, medId));
  const unidades = toma.unidades ?? med?.unidadesPorToma ?? 1;
  const devuelve = med && med.activo !== false && unidades > 0;
  const at = new Date().toISOString();

  const ops = [{ Delete: { Key: keys.toma(g, fecha, hora, medId), ConditionExpression: 'attribute_exists(PK)' } }];
  if (devuelve) {
    ops.push({
      Update: {
        Key: keys.med(g, medId),
        UpdateExpression: 'SET stockUnidades = stockUnidades + :u',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeValues: { ':u': unidades },
      },
    });
    ops.push({ Put: { Item: movimiento(g, { medId, tipo: 'AJUSTE', unidades, registradoPor: quien, at }) } });
  }

  try {
    await transact(ops);
  } catch (err) {
    if (cancellationCodes(err)?.[0] === 'ConditionalCheckFailed') return res.json({ ok: true, yaNoExistia: true });
    throw err;
  }

  return res.json({ ok: true, ...(devuelve && resumenStock(med, med.stockUnidades + unidades)) });
}));

module.exports = router;

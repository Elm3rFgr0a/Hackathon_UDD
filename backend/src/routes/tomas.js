// Tomas de medicamentos. Registrar una toma descuenta stock en la misma
// transacción; repetirla no descuenta dos veces.

const crypto = require('crypto');
const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { requireAuth } = require('../auth/token');
const { exigirSobrePersona } = require('../auth/permisos');
const { getItem, transact, cancellationCodes } = require('../db/repo');
const { keys } = require('../db/keys');
const { check } = require('../domain/validar');
const { stockDias, semaforo } = require('../domain/stock');

const router = express.Router();

const movimiento = (grupoId, { medId, tipo, unidades, registradoPor, at }) => ({
  ...keys.movimiento(grupoId, at, crypto.randomUUID()),
  entidad: 'MOV', medId, tipo, unidades, registradoPor, fecha: at,
});

const resumenStock = (med, stockUnidades) => {
  const dias = stockDias({ ...med, stockUnidades });
  return { stockUnidades, stockDias: dias, semaforo: semaforo(dias, med.umbralDias) };
};

router.put('/tomas', requireAuth, asyncHandler(async (req, res) => {
  const { medId, fecha, hora, at } = check(req.body)
    .id('medId').fecha('fecha').hora('hora').instante('at', { defecto: new Date().toISOString() }).done();
  const { grupoId: g, personaId: quien } = req.sesion;

  const med = await getItem(keys.med(g, medId));
  if (!med || med.activo === false) throw new HttpError(404, 'Remedio no encontrado.');
  exigirSobrePersona(req.sesion, med.personaId);
  if (!med.horarios.includes(hora)) throw new HttpError(400, 'Ese horario no corresponde a este remedio.');

  // Si no queda stock, la toma se registra igual (la persona sí la tomó), sin descontar.
  const porToma = med.unidadesPorToma ?? 1;
  const unidades = med.stockUnidades >= porToma ? porToma : 0;

  const ops = [{
    Put: {
      Item: {
        ...keys.toma(g, fecha, hora, medId), entidad: 'TOMA',
        medId, personaId: med.personaId, fecha, hora, at, registradaPor: quien, unidades,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    },
  }];
  if (unidades > 0) {
    ops.push({
      Update: {
        Key: keys.med(g, medId),
        UpdateExpression: 'SET stockUnidades = stockUnidades - :u',
        ConditionExpression: 'stockUnidades >= :u',
        ExpressionAttributeValues: { ':u': unidades },
      },
    });
    ops.push({ Put: { Item: movimiento(g, { medId, tipo: 'CONSUMO', unidades: -unidades, registradoPor: quien, at }) } });
  }

  try {
    await transact(ops);
  } catch (err) {
    const codes = cancellationCodes(err);
    if (codes?.[0] === 'ConditionalCheckFailed') return res.json({ ok: true, yaRegistrada: true });
    if (codes?.[1] === 'ConditionalCheckFailed') throw new HttpError(409, 'El stock cambió mientras registrábamos la toma. Intenta de nuevo.');
    throw err;
  }

  return res.status(201).json({ ok: true, ...resumenStock(med, med.stockUnidades - unidades) });
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

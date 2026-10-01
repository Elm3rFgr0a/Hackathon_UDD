// Registro de tomas con descuento de stock. Lo usan PUT /tomas (la persona o su
// familia) y la ronda del ELEAM.

const crypto = require('crypto');
const { transact, cancellationCodes } = require('../db/repo');
const { keys } = require('../db/keys');
const { HttpError } = require('../http');
const { stockDias, semaforo } = require('../domain/stock');
const { alertarSiCruzaUmbral } = require('./alertas');

const movimiento = (grupoId, { medId, tipo, unidades, registradoPor, at }) => ({
  ...keys.movimiento(grupoId, at, crypto.randomUUID()),
  entidad: 'MOV', medId, tipo, unidades, registradoPor, fecha: at,
});

const resumenStock = (med, stockUnidades) => {
  const dias = stockDias({ ...med, stockUnidades });
  return { stockUnidades, stockDias: dias, semaforo: semaforo(dias, med.umbralDias) };
};

/**
 * Registra la toma y descuenta `unidadesPorToma` en una transacción. Repetirla
 * no descuenta dos veces. Si no queda stock, se registra igual (la persona sí
 * la tomó), sin descontar. Si el stock cruza el umbral, envía la alerta.
 * Devuelve { yaRegistrada } o { yaRegistrada: false, alerta, ...resumenStock }.
 */
async function registrarToma(g, med, { fecha, hora, at, quien }) {
  const porToma = med.unidadesPorToma ?? 1;
  const unidades = med.stockUnidades >= porToma ? porToma : 0;

  const ops = [{
    Put: {
      Item: {
        ...keys.toma(g, fecha, hora, med.id), entidad: 'TOMA',
        medId: med.id, personaId: med.personaId, fecha, hora, at, registradaPor: quien, unidades,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    },
  }];
  if (unidades > 0) {
    ops.push({
      Update: {
        Key: keys.med(g, med.id),
        UpdateExpression: 'SET stockUnidades = stockUnidades - :u',
        ConditionExpression: 'stockUnidades >= :u',
        ExpressionAttributeValues: { ':u': unidades },
      },
    });
    ops.push({ Put: { Item: movimiento(g, { medId: med.id, tipo: 'CONSUMO', unidades: -unidades, registradoPor: quien, at }) } });
  }

  try {
    await transact(ops);
  } catch (err) {
    const codes = cancellationCodes(err);
    if (codes?.[0] === 'ConditionalCheckFailed') return { yaRegistrada: true };
    if (codes?.[1] === 'ConditionalCheckFailed') throw new HttpError(409, 'El stock cambió mientras registrábamos la toma. Intenta de nuevo.');
    throw err;
  }

  const despues = med.stockUnidades - unidades;
  const alerta = unidades > 0 ? await alertarSiCruzaUmbral(g, med, med.stockUnidades, despues, at) : null;
  return { yaRegistrada: false, alerta, ...resumenStock(med, despues) };
}

module.exports = { registrarToma, movimiento, resumenStock };

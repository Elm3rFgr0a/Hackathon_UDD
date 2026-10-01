const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { deletePartition, deleteMany, putMany } = require('../db/repo');
const { CERCA_PK } = require('../db/keys');
const { buildSeedItems, seedAccountKeys, seedPartitions } = require('../seed/seed');

const router = express.Router();

/**
 * Restaura los datos de demostración. Recibe `{ now }` (ISO) del cliente para
 * que las fechas relativas coincidan con su reloj, incluido el simulado (?hora=).
 * No exige sesión porque el front lo ofrece en la pantalla de login.
 */
router.post('/demo/reset', asyncHandler(async (req, res) => {
  const raw = req.body?.now;
  const now = raw === undefined ? new Date() : new Date(raw);
  if (Number.isNaN(now.getTime())) throw new HttpError(400, 'now debe ser una fecha ISO válida.');

  // Desfase de la hora simulada respecto de la real. Bajo un minuto se considera hora real.
  const reseteadoEn = new Date();
  const desfase = now.getTime() - reseteadoEn.getTime();
  const relojOffsetMs = Math.abs(desfase) < 60 * 1000 ? 0 : desfase;

  const items = await buildSeedItems(now, { relojOffsetMs, reseteadoEn: reseteadoEn.toISOString() });
  await Promise.all([
    ...seedPartitions().map(deletePartition),
    deletePartition(CERCA_PK),
    deleteMany(seedAccountKeys()),
  ]);
  await putMany(items);

  res.json({ message: 'Datos de demostración restablecidos', registros: items.length, now: now.toISOString(), reloj: { offsetMs: relojOffsetMs } });
}));

module.exports = router;

const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { deletePartition, deleteMany, putMany } = require('../db/repo');
const { grupoPK, CERCA_PK } = require('../db/keys');
const { SEED_GRUPO_ID, buildSeedItems, seedAccountKeys } = require('../seed/seed');

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

  const items = await buildSeedItems(now);
  await Promise.all([
    deletePartition(grupoPK(SEED_GRUPO_ID)),
    deletePartition(CERCA_PK),
    deleteMany(seedAccountKeys()),
  ]);
  await putMany(items);

  res.json({ message: 'Datos de demostración restablecidos', registros: items.length, now: now.toISOString() });
}));

module.exports = router;

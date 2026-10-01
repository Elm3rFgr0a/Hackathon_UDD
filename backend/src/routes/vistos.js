// Avisos vistos. Cada quien marca solo los suyos: el viewer sale del token.

const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { requireAuth } = require('../auth/token');
const { putMany } = require('../db/repo');
const { keys } = require('../db/keys');

const router = express.Router();

const MAX_IDS = 200;

// Los ids de aviso los arma el front (`med-time|m-losartan|2026-10-01|13:00`),
// así que solo se exige texto corto y sin '#', que separa las partes de la clave.
const avisoValido = (id) => typeof id === 'string' && id.length > 0 && id.length <= 300 && !id.includes('#');

router.post('/vistos', requireAuth, asyncHandler(async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS || !ids.every(avisoValido)) {
    throw new HttpError(400, `ids debe ser una lista de 1 a ${MAX_IDS} avisos.`);
  }
  const { grupoId: g, personaId: viewerId } = req.sesion;
  await putMany([...new Set(ids)].map((avisoId) => ({
    ...keys.visto(g, viewerId, avisoId), entidad: 'VISTO', viewerId, avisoId,
  })));
  res.json({ ok: true });
}));

module.exports = router;

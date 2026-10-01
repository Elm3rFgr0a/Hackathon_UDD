const express = require('express');
const { asyncHandler } = require('../http');
const { requireAuth } = require('../auth/token');
const { queryPartition } = require('../db/repo');
const { grupoPK, CERCA_PK } = require('../db/keys');
const { construirEstado } = require('../domain/estado');

const router = express.Router();

// El grupo sale del token, nunca de la petición: nadie puede leer otro grupo.
router.get('/estado', requireAuth, asyncHandler(async (req, res) => {
  const [items, cerca] = await Promise.all([
    queryPartition(grupoPK(req.sesion.grupoId)),
    queryPartition(CERCA_PK),
  ]);
  res.json(construirEstado(items, cerca, req.sesion));
}));

module.exports = router;

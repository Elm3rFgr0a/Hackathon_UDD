const express = require('express');
const { HttpError, asyncHandler } = require('../http');
const { getCuenta, getItem } = require('../db/repo');
const { keys } = require('../db/keys');
const { verifyPassword } = require('../auth/password');
const { signToken } = require('../auth/token');

const router = express.Router();

const CREDENCIALES_INVALIDAS = 'El correo o la contraseña no coinciden.';

router.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    throw new HttpError(400, 'Escribe tu correo y tu contraseña.');
  }

  const cuenta = await getCuenta(email);
  if (!cuenta || !(await verifyPassword(password, cuenta.passwordHash))) {
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  // El permiso de un familiar vive en su registro de miembro del núcleo.
  let permiso;
  if (cuenta.rol === 'familiar') {
    const miembro = await getItem(keys.miembro(cuenta.grupoId, cuenta.personaId));
    if (!miembro || miembro.estado !== 'activo') throw new HttpError(401, CREDENCIALES_INVALIDAS);
    permiso = miembro.permiso;
  }

  // El personal de un ELEAM debe seguir activo en su establecimiento.
  if (cuenta.rol === 'eleam') {
    const personal = await getItem(keys.personal(cuenta.establecimientoId, cuenta.personaId));
    if (!personal || personal.estado !== 'activo') throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  const token = signToken({
    personaId: cuenta.personaId, rol: cuenta.rol, grupoId: cuenta.grupoId, permiso, establecimientoId: cuenta.establecimientoId,
  });

  // `sesion` tiene la misma forma que guarda hoy el front en localStorage.
  res.json({
    token,
    sesion: {
      rol: cuenta.rol,
      personId: cuenta.personaId,
      selectedElderId: cuenta.rol === 'adulto' ? cuenta.personaId : null,
      permiso: permiso ?? null,
      ...(cuenta.rol === 'eleam' && { establecimientoId: cuenta.establecimientoId }),
    },
  });
}));

module.exports = router;

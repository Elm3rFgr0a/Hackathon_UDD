// Token de sesión (JWT). Lleva los mismos datos que daría Cognito, para poder
// cambiar el login más adelante sin tocar las rutas.

const jwt = require('jsonwebtoken');
const { HttpError } = require('../http');

const DURACION = '12h';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('Falta la variable de entorno JWT_SECRET');
  return s;
}

/**
 * sesion: { personaId, rol: 'adulto' | 'familiar' | 'eleam', grupoId?, permiso?, establecimientoId? }
 * El personal de un ELEAM no pertenece a un grupo: su alcance es su establecimiento.
 */
const signToken = ({ personaId, rol, grupoId, permiso, establecimientoId }) =>
  jwt.sign({ rol, grupoId, permiso, establecimientoId }, secret(), { subject: personaId, expiresIn: DURACION });

function leerSesion(req) {
  const match = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  if (!match) throw new HttpError(401, 'Falta iniciar sesión.');
  try {
    const p = jwt.verify(match[1], secret());
    return { personaId: p.sub, rol: p.rol, grupoId: p.grupoId, permiso: p.permiso, establecimientoId: p.establecimientoId };
  } catch {
    throw new HttpError(401, 'Tu sesión expiró. Vuelve a ingresar.');
  }
}

/** Exige sesión de un grupo familiar (persona mayor o familiar) y la deja en req.sesion. */
function requireAuth(req, res, next) {
  try {
    req.sesion = leerSesion(req);
    if (!req.sesion.grupoId) throw new HttpError(403, 'Esta cuenta no tiene acceso a un grupo familiar.');
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Exige sesión del personal de un ELEAM. */
function requireEleam(req, res, next) {
  try {
    req.sesion = leerSesion(req);
    if (req.sesion.rol !== 'eleam' || !req.sesion.establecimientoId) throw new HttpError(403, 'Solo el personal del ELEAM puede usar esta vista.');
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { signToken, requireAuth, requireEleam };

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

/** sesion: { personaId, rol: 'adulto' | 'familiar', grupoId, permiso?: 'admin' | 'edita' | 've' } */
const signToken = ({ personaId, rol, grupoId, permiso }) =>
  jwt.sign({ rol, grupoId, permiso }, secret(), { subject: personaId, expiresIn: DURACION });

/** Exige `Authorization: Bearer <token>` y deja la sesión en req.sesion. */
function requireAuth(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  if (!match) return next(new HttpError(401, 'Falta iniciar sesión.'));
  try {
    const payload = jwt.verify(match[1], secret());
    req.sesion = { personaId: payload.sub, rol: payload.rol, grupoId: payload.grupoId, permiso: payload.permiso };
    return next();
  } catch {
    return next(new HttpError(401, 'Tu sesión expiró. Vuelve a ingresar.'));
  }
}

module.exports = { signToken, requireAuth };

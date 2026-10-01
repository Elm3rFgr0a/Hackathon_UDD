// Permisos (docs/PLAN_BACKEND.md, sección 3). Se validan en el servidor aunque
// el front ya oculte lo que cada quien no puede hacer.

const { HttpError } = require('../http');

const NIVEL = { ve: 0, edita: 1, admin: 2 };

const SIN_PERMISO = 'No tienes permiso para esta acción.';

/** Familiar con al menos el permiso `min` ('ve' | 'edita' | 'admin'). */
const tienePermiso = (sesion, min) => sesion.rol === 'familiar' && (NIVEL[sesion.permiso] ?? -1) >= NIVEL[min];

/** La persona mayor solo actúa sobre sí misma; un familiar necesita `edita`. */
const puedeActuarSobre = (sesion, personaId) =>
  sesion.rol === 'adulto' ? sesion.personaId === personaId : tienePermiso(sesion, 'edita');

/** Middleware: exige un familiar con al menos el permiso `min`. */
const exigirPermiso = (min) => (req, res, next) =>
  next(tienePermiso(req.sesion, min) ? undefined : new HttpError(403, SIN_PERMISO));

function exigirSobrePersona(sesion, personaId) {
  if (!puedeActuarSobre(sesion, personaId)) throw new HttpError(403, SIN_PERMISO);
}

module.exports = { tienePermiso, puedeActuarSobre, exigirPermiso, exigirSobrePersona };

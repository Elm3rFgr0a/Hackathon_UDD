// ELEAM (Establecimientos de Larga Estadía para Adultos Mayores) conocidos.
// Para la demo es un catálogo fijo; en producción vendría de la tabla.

const ESTABLECIMIENTOS = [
  { id: 'est-los-aromos', nombre: 'ELEAM Los Aromos' },
];

const establecimientoPorId = (id) => ESTABLECIMIENTOS.find((e) => e.id === id) ?? null;

/**
 * El formulario del front guarda dónde vive la persona como texto ("ELEAM Los
 * Aromos"). Si coincide con un establecimiento del catálogo, devuelve su id.
 */
const establecimientoDeResidencia = (residencia) =>
  ESTABLECIMIENTOS.find((e) => e.nombre.toLowerCase() === String(residencia ?? '').trim().toLowerCase())?.id ?? null;

module.exports = { ESTABLECIMIENTOS, establecimientoPorId, establecimientoDeResidencia };

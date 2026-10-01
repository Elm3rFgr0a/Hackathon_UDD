// Cálculo de stock de un medicamento. El stock se guarda en unidades; la API
// entrega días restantes y semáforo calculados.

const UMBRAL_DIAS_DEFECTO = 7;
const DIAS_ROJO = 3;

/** Unidades que se consumen al día. */
const consumoDiario = (med) => (med.unidadesPorToma ?? 1) * (med.horarios?.length ?? 0);

/** Días completos que alcanza el stock. Null si el remedio no tiene horarios. */
function stockDias(med) {
  const consumo = consumoDiario(med);
  if (consumo <= 0) return null;
  return Math.max(0, Math.floor(med.stockUnidades / consumo));
}

/** 'rojo' (≤ 3 días), 'amarillo' (≤ umbral) o 'verde'. */
function semaforo(dias, umbralDias = UMBRAL_DIAS_DEFECTO) {
  if (dias === null) return 'verde';
  if (dias <= DIAS_ROJO) return 'rojo';
  if (dias <= umbralDias) return 'amarillo';
  return 'verde';
}

/** Convierte días de stock (lo que envía el formulario del front) a unidades. */
const unidadesDesdeDias = (dias, med) => Math.max(0, Math.floor(dias)) * consumoDiario(med);

module.exports = { UMBRAL_DIAS_DEFECTO, consumoDiario, stockDias, semaforo, unidadesDesdeDias };

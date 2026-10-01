// Reglas de las alertas que envía el servidor (fase D). Sin DynamoDB ni red:
// deciden cuándo avisar, a quién y con qué texto.

const { stockDias, semaforo } = require('./stock');

const GRAVEDAD = { verde: 0, amarillo: 1, rojo: 2 };

/**
 * Si el stock empeoró de semáforo con un consumo (verde → amarillo, amarillo →
 * rojo, verde → rojo), devuelve el nuevo semáforo. Si no, null. Así se avisa una
 * vez por cruce de umbral y no en cada toma.
 */
function cruceDeUmbral(med, unidadesAntes, unidadesDespues) {
  const antes = semaforo(stockDias({ ...med, stockUnidades: unidadesAntes }), med.umbralDias);
  const despues = semaforo(stockDias({ ...med, stockUnidades: unidadesDespues }), med.umbralDias);
  return GRAVEDAD[despues] > GRAVEDAD[antes] ? despues : null;
}

const diasTexto = (dias) => (dias === 1 ? '1 día' : `${dias} días`);

function alertaStock({ med, persona, responsable, unidades }) {
  const dias = stockDias({ ...med, stockUnidades: unidades });
  const nivel = semaforo(dias, med.umbralDias);
  return {
    tipo: 'stock',
    nivel,
    titulo: `A ${med.nombre} de ${persona.nombre} le ${dias === 1 ? 'queda' : 'quedan'} ${diasTexto(dias)}`,
    mensaje: `Autia: a ${med.nombre} ${med.dosis} de ${persona.nombre} le ${dias === 1 ? 'queda' : 'quedan'} ${diasTexto(dias)}`
      + `${nivel === 'rojo' ? ' (stock crítico)' : ''}.`
      + `${responsable ? ` Compra a cargo de ${responsable.nombre}.` : ''}`,
  };
}

const MOTIVOS = {
  rechazo: 'Rechazó el remedio',
  dormido: 'Estaba dormido',
  ausente: 'No estaba en el establecimiento',
  sin_stock: 'No quedaba stock',
  otro: 'Otro motivo',
};

function alertaOmision({ med, persona, hora, motivo, establecimiento }) {
  return {
    tipo: 'omision',
    nivel: 'rojo',
    titulo: `${persona.nombre} no recibió ${med.nombre} de las ${hora}`,
    mensaje: `Autia: ${persona.nombre} no recibió ${med.nombre} ${med.dosis} de las ${hora}`
      + `${establecimiento ? ` en ${establecimiento.nombre}` : ''}. Motivo: ${MOTIVOS[motivo] ?? motivo}.`,
  };
}

/**
 * Quiénes reciben una alerta de un remedio: el responsable de la compra y los
 * administradores del núcleo, activos y con teléfono. Sin repetir.
 */
function destinatarios(miembros, med) {
  const vistos = new Set();
  return miembros.filter((m) => {
    const corresponde = m.estado === 'activo' && m.telefono && (m.id === med.responsableId || m.permiso === 'admin');
    if (!corresponde || vistos.has(m.id)) return false;
    vistos.add(m.id);
    return true;
  });
}

module.exports = { cruceDeUmbral, alertaStock, alertaOmision, destinatarios, MOTIVOS };

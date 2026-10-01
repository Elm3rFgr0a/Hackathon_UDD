// Claves de la tabla única (ver docs/PLAN_BACKEND.md, sección 2).
// Cada registro guarda además `entidad`, para mapearlo sin parsear la SK.

const normEmail = (email) => String(email).trim().toLowerCase();

const keys = {
  grupo: (grupoId) => ({ PK: `GRUPO#${grupoId}`, SK: 'META' }),
  persona: (grupoId, id) => ({ PK: `GRUPO#${grupoId}`, SK: `PERSONA#${id}` }),
  miembro: (grupoId, id) => ({ PK: `GRUPO#${grupoId}`, SK: `MIEMBRO#${id}` }),
  med: (grupoId, id) => ({ PK: `GRUPO#${grupoId}`, SK: `MED#${id}` }),
  evento: (grupoId, id) => ({ PK: `GRUPO#${grupoId}`, SK: `EVENTO#${id}` }),
  toma: (grupoId, fecha, hora, medId) => ({ PK: `GRUPO#${grupoId}`, SK: `TOMA#${fecha}#${hora}#${medId}` }),
  asistencia: (grupoId, eventoId, personaId) => ({ PK: `GRUPO#${grupoId}`, SK: `ASIST#${eventoId}#${personaId}` }),
  visto: (grupoId, viewerId, avisoId) => ({ PK: `GRUPO#${grupoId}`, SK: `VISTO#${viewerId}#${avisoId}` }),
  movimiento: (grupoId, timestamp, id) => ({ PK: `GRUPO#${grupoId}`, SK: `MOV#${timestamp}#${id}` }),
  cuenta: (email) => ({ PK: `CUENTA#${normEmail(email)}`, SK: 'CUENTA' }),
  cerca: (fecha, id) => ({ PK: 'CERCA', SK: `EVT#${fecha}#${id}` }),
  // Fase D
  omision: (grupoId, fecha, hora, medId) => ({ PK: `GRUPO#${grupoId}`, SK: `OMISION#${fecha}#${hora}#${medId}` }),
  alerta: (grupoId, timestamp, id) => ({ PK: `GRUPO#${grupoId}`, SK: `ALERTA#${timestamp}#${id}` }),
  establecimiento: (estId) => ({ PK: `ESTAB#${estId}`, SK: 'META' }),
  personal: (estId, id) => ({ PK: `ESTAB#${estId}`, SK: `STAFF#${id}` }),
};

/**
 * Atributos del índice GSI1 (vista ELEAM): personas y remedios de residentes de
 * un establecimiento, sin importar a qué grupo familiar pertenecen.
 * Sin establecimiento no devuelve nada: un registro sin GSI1PK no entra al índice
 * (DynamoDB no acepta null en la clave de un índice).
 */
const gsiEstablecimiento = (estId, grupoId, tipo, id) => (estId
  ? { GSI1PK: `ESTAB#${estId}`, GSI1SK: `${tipo}#${grupoId}#${id}` }
  : {});

const grupoPK = (grupoId) => `GRUPO#${grupoId}`;
const CERCA_PK = 'CERCA';

const estabPK = (estId) => `ESTAB#${estId}`;

module.exports = { keys, grupoPK, CERCA_PK, estabPK, normEmail, gsiEstablecimiento };

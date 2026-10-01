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
};

const grupoPK = (grupoId) => `GRUPO#${grupoId}`;
const CERCA_PK = 'CERCA';

module.exports = { keys, grupoPK, CERCA_PK, normEmail };

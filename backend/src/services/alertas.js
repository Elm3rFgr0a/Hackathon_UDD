// Envía una alerta a los miembros que corresponden y la guarda en el grupo,
// para que la familia la vea en "Avisos" con su estado de envío.

const crypto = require('crypto');
const { getItem, putItem, queryPrefix } = require('../db/repo');
const { keys, grupoPK } = require('../db/keys');
const { destinatarios, alertaStock, alertaOmision, cruceDeUmbral } = require('../domain/alertas');
const { notifier } = require('../notify/notifier');

const miembrosDe = (g) => queryPrefix(grupoPK(g), 'MIEMBRO#');

function estadoEnvio(para, envios, canal) {
  if (!para.length) return 'sin_destinatarios';
  if (envios.every((e) => e.ok)) return canal === 'simulado' ? 'simulada' : 'enviada';
  return envios.some((e) => e.ok) ? 'parcial' : 'fallida';
}

/** alerta: { tipo, nivel, titulo, mensaje }. Devuelve el registro guardado. */
async function enviarAlerta(g, { alerta, med, persona, at }) {
  const n = notifier();
  const para = destinatarios(await miembrosDe(g), med);

  // Con WHATSAPP_DEMO_TO se envía un solo mensaje al teléfono de la demo.
  let envios;
  if (para.length && n.demoTo) {
    const r = await n.send({ to: n.demoTo, body: alerta.mensaje });
    envios = para.map(() => r);
  } else {
    envios = await Promise.all(para.map((m) => n.send({ to: m.telefono, body: alerta.mensaje })));
  }

  const id = crypto.randomUUID();
  const item = {
    ...keys.alerta(g, at, id), entidad: 'ALERTA',
    id, ...alerta, personaId: persona.id, medId: med.id, at,
    canal: n.canal,
    estado: estadoEnvio(para, envios, n.canal),
    destinatarios: para.map((m, i) => ({ id: m.id, nombre: m.nombre, ok: envios[i].ok })),
    ...(envios.find((e) => !e.ok) && { error: envios.find((e) => !e.ok).error }),
  };
  await putItem(item);
  return item;
}

/** Tras un consumo, avisa si el stock cruzó el umbral. No lanza: una alerta fallida no deshace la toma. */
async function alertarSiCruzaUmbral(g, med, unidadesAntes, unidadesDespues, at) {
  if (!cruceDeUmbral(med, unidadesAntes, unidadesDespues)) return null;
  try {
    const [persona, responsable] = await Promise.all([
      getItem(keys.persona(g, med.personaId)),
      med.responsableId ? getItem(keys.miembro(g, med.responsableId)) : null,
    ]);
    if (!persona) return null;
    const alerta = alertaStock({ med, persona, responsable, unidades: unidadesDespues });
    return await enviarAlerta(g, { alerta, med, persona, at });
  } catch (err) {
    console.error('No se pudo enviar la alerta de stock', err);
    return null;
  }
}

/** Dosis no dada en un ELEAM: avisa a la familia. No lanza. */
async function alertarOmision(g, { med, persona, hora, motivo, establecimiento, at }) {
  try {
    const alerta = alertaOmision({ med, persona, hora, motivo, establecimiento });
    return await enviarAlerta(g, { alerta, med, persona, at });
  } catch (err) {
    console.error('No se pudo enviar la alerta de dosis no dada', err);
    return null;
  }
}

module.exports = { enviarAlerta, alertarSiCruzaUmbral, alertarOmision };

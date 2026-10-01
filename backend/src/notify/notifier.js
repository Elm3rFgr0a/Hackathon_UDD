// Envío de alertas fuera de la app (fase D). Interfaz común `send({ to, body })`
// que devuelve { ok, canal, error? } y nunca lanza: una alerta que no se pudo
// enviar no debe hacer fallar la acción que la provocó (por ejemplo, una toma).

/** Respaldo de la demo: no envía nada, solo deja registro (y en los logs de la Lambda). */
class MockNotifier {
  constructor() {
    this.canal = 'simulado';
    this.enviados = [];
  }

  async send({ to, body }) {
    this.enviados.push({ to, body });
    if (process.env.NODE_ENV !== 'test') console.log(`[aviso simulado] → ${to}: ${body}`);
    return { ok: true, canal: this.canal };
  }
}

/** WhatsApp con la API REST de Twilio (sin SDK: usa fetch de Node). */
class TwilioWhatsAppNotifier {
  constructor({ accountSid, authToken, from, timeoutMs = 4000 }) {
    this.canal = 'whatsapp';
    this.accountSid = accountSid;
    this.auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    this.from = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
    this.timeoutMs = timeoutMs;
  }

  async send({ to, body }) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Basic ${this.auth}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: this.from, To: `whatsapp:${to}`, Body: body }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (res.ok) return { ok: true, canal: this.canal };
      const data = await res.json().catch(() => ({}));
      return { ok: false, canal: this.canal, error: data.message || `Twilio respondió ${res.status}` };
    } catch (err) {
      return { ok: false, canal: this.canal, error: err.name === 'TimeoutError' ? 'Twilio no respondió a tiempo' : err.message };
    }
  }
}

/**
 * Usa Twilio si están sus tres variables; si no, el simulado. Con
 * WHATSAPP_DEMO_TO, todos los mensajes van a ese número (el teléfono de la
 * demo), porque los teléfonos del seed son ficticios.
 */
function crearNotifier(env = process.env) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = env;
  const base = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM
    ? new TwilioWhatsAppNotifier({ accountSid: TWILIO_ACCOUNT_SID, authToken: TWILIO_AUTH_TOKEN, from: TWILIO_WHATSAPP_FROM })
    : new MockNotifier();
  base.demoTo = (env.WHATSAPP_DEMO_TO || '').trim() || null;
  return base;
}

let actual = null;
/** Notificador de la Lambda (se crea una vez por contenedor). */
const notifier = () => {
  actual ??= crearNotifier();
  return actual;
};
/** Solo para tests. */
const setNotifier = (n) => {
  actual = n;
};

module.exports = { MockNotifier, TwilioWhatsAppNotifier, crearNotifier, notifier, setNotifier };

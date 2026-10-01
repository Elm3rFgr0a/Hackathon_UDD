const test = require('node:test');
const assert = require('node:assert/strict');
const { crearNotifier, MockNotifier, TwilioWhatsAppNotifier } = require('./notifier');

test('sin credenciales de Twilio usa el notificador simulado', async () => {
  const n = crearNotifier({});
  assert.ok(n instanceof MockNotifier);
  assert.deepEqual(await n.send({ to: '+56911112222', body: 'hola' }), { ok: true, canal: 'simulado' });
  assert.equal(n.enviados.length, 1);
});

test('con las tres variables usa WhatsApp de Twilio y respeta el número de demo', () => {
  const n = crearNotifier({ TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't', TWILIO_WHATSAPP_FROM: '+14155238886', WHATSAPP_DEMO_TO: '+56999999999' });
  assert.ok(n instanceof TwilioWhatsAppNotifier);
  assert.equal(n.from, 'whatsapp:+14155238886');
  assert.equal(n.demoTo, '+56999999999');
});

test('si Twilio falla devuelve el error en vez de lanzar', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ message: 'número no unido al sandbox' }), { status: 400 }));
  const n = new TwilioWhatsAppNotifier({ accountSid: 'AC1', authToken: 't', from: '+1' });
  const r = await n.send({ to: '+569', body: 'x' });
  assert.deepEqual(r, { ok: false, canal: 'whatsapp', error: 'número no unido al sandbox' });
});

test('envía a Twilio el formulario con From, To y Body', async (t) => {
  let pedido;
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    pedido = { url, opts };
    return new Response('{}', { status: 201 });
  });
  const n = new TwilioWhatsAppNotifier({ accountSid: 'AC1', authToken: 't', from: 'whatsapp:+1' });
  assert.equal((await n.send({ to: '+56911', body: 'hola' })).ok, true);
  assert.equal(pedido.url, 'https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json');
  const form = new URLSearchParams(pedido.opts.body);
  assert.equal(form.get('To'), 'whatsapp:+56911');
  assert.equal(form.get('From'), 'whatsapp:+1');
  assert.equal(form.get('Body'), 'hola');
});

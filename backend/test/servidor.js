// Levanta la API real (Express) contra la DynamoDB en memoria y un notificador
// simulado, para probar los flujos por HTTP sin AWS.

process.env.TABLE_NAME ??= 'Cerca-test';
process.env.JWT_SECRET ??= 'secreto-de-prueba';
process.env.NODE_ENV = 'test';

const { FakeDynamo } = require('./fakeDynamo');
const { doc } = require('../src/db/client');
const { MockNotifier, setNotifier } = require('../src/notify/notifier');

async function levantar() {
  const db = new FakeDynamo();
  doc.send = (cmd) => db.send(cmd);
  const notifier = new MockNotifier();
  setNotifier(notifier);

  const app = require('../src/app');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function api(method, path, body, token) {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  }

  const login = async (email) => (await api('POST', '/auth/login', { email, password: '1234' })).body.token;

  return { db, notifier, api, login, cerrar: () => new Promise((r) => server.close(r)) };
}

module.exports = { levantar };

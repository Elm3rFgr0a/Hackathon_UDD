const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('./password');

test('verifica la contraseña correcta y rechaza la incorrecta', async () => {
  const stored = await hashPassword('1234');
  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.equal(await verifyPassword('1234', stored), true);
  assert.equal(await verifyPassword('12345', stored), false);
});

test('dos hashes de la misma contraseña son distintos (sal aleatoria)', async () => {
  assert.notEqual(await hashPassword('1234'), await hashPassword('1234'));
});

test('rechaza un hash mal formado sin lanzar error', async () => {
  assert.equal(await verifyPassword('1234', 'texto-plano'), false);
  assert.equal(await verifyPassword('1234', undefined), false);
});

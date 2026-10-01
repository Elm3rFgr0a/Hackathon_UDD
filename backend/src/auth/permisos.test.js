const test = require('node:test');
const assert = require('node:assert/strict');
const { tienePermiso, puedeActuarSobre, exigirSobrePersona } = require('./permisos');

const camila = { rol: 'familiar', personaId: 'u-camila', permiso: 'admin' };
const jorge = { rol: 'familiar', personaId: 'u-jorge', permiso: 'edita' };
const marta = { rol: 'familiar', personaId: 'u-marta', permiso: 've' };
const rosa = { rol: 'adulto', personaId: 'e-rosa' };

test('los niveles de permiso son acumulativos', () => {
  assert.equal(tienePermiso(camila, 'admin'), true);
  assert.equal(tienePermiso(camila, 'edita'), true);
  assert.equal(tienePermiso(jorge, 'edita'), true);
  assert.equal(tienePermiso(jorge, 'admin'), false);
  assert.equal(tienePermiso(marta, 've'), true);
  assert.equal(tienePermiso(marta, 'edita'), false);
});

test('la persona mayor no tiene permisos de familiar', () => {
  assert.equal(tienePermiso(rosa, 've'), false);
  assert.equal(tienePermiso({ rol: 'familiar' }, 've'), false); // sin permiso en el token
});

test('la persona mayor solo actúa sobre sí misma', () => {
  assert.equal(puedeActuarSobre(rosa, 'e-rosa'), true);
  assert.equal(puedeActuarSobre(rosa, 'e-hector'), false);
});

test('un familiar actúa sobre una persona con permiso edita o más', () => {
  assert.equal(puedeActuarSobre(jorge, 'e-rosa'), true);
  assert.equal(puedeActuarSobre(marta, 'e-rosa'), false);
  assert.throws(() => exigirSobrePersona(marta, 'e-rosa'), { status: 403 });
});
